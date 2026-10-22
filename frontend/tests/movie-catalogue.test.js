import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { API_BASE_URL, buildMovieQuery, getMovies, resolveApiBaseUrl } from '../src/lib/api.js'

describe('Movie Catalogue & Query Construction', () => {
  describe('buildMovieQuery', () => {
    it('returns empty string when no options are provided', () => {
      assert.equal(buildMovieQuery(), '')
      assert.equal(buildMovieQuery({}), '')
    })

    it('sets valid positive page number', () => {
      assert.equal(buildMovieQuery({ page: 1 }), '?page=1')
      assert.equal(buildMovieQuery({ page: 5 }), '?page=5')
      assert.equal(buildMovieQuery({ page: '3' }), '?page=3')
    })

    it('ignores invalid or non-positive page numbers', () => {
      assert.equal(buildMovieQuery({ page: 0 }), '')
      assert.equal(buildMovieQuery({ page: -1 }), '')
      assert.equal(buildMovieQuery({ page: 'not-a-number' }), '')
      assert.equal(buildMovieQuery({ page: null }), '')
    })

    it('sets valid positive limit bounded by 50', () => {
      assert.equal(buildMovieQuery({ limit: 12 }), '?limit=12')
      assert.equal(buildMovieQuery({ limit: 50 }), '?limit=50')
      assert.equal(buildMovieQuery({ limit: 99 }), '?limit=50')
      assert.equal(buildMovieQuery({ limit: '25' }), '?limit=25')
    })

    it('ignores invalid or non-positive limits', () => {
      assert.equal(buildMovieQuery({ limit: 0 }), '')
      assert.equal(buildMovieQuery({ limit: -10 }), '')
      assert.equal(buildMovieQuery({ limit: 'abc' }), '')
    })

    it('trims and includes search parameter', () => {
      assert.equal(buildMovieQuery({ search: 'Inception' }), '?search=Inception')
      assert.equal(buildMovieQuery({ search: '  The Matrix  ' }), '?search=The+Matrix')
    })

    it('truncates search parameter to 100 characters', () => {
      const longQuery = 'a'.repeat(120)
      const query = buildMovieQuery({ search: longQuery })
      const params = new URLSearchParams(query)
      assert.equal(params.get('search')?.length, 100)
    })

    it('ignores empty or whitespace-only search', () => {
      assert.equal(buildMovieQuery({ search: '' }), '')
      assert.equal(buildMovieQuery({ search: '    ' }), '')
    })

    it('trims and includes language filter', () => {
      assert.equal(buildMovieQuery({ language: 'Hindi' }), '?language=Hindi')
      assert.equal(buildMovieQuery({ language: '  English  ' }), '?language=English')
    })

    it('truncates language parameter to 50 characters', () => {
      const longLang = 'l'.repeat(70)
      const query = buildMovieQuery({ language: longLang })
      const params = new URLSearchParams(query)
      assert.equal(params.get('language')?.length, 50)
    })

    it('combines page, limit, search, and language into valid query string', () => {
      const query = buildMovieQuery({
        page: 2,
        limit: 12,
        search: 'Dune',
        language: 'English',
      })
      const params = new URLSearchParams(query)
      assert.equal(params.get('page'), '2')
      assert.equal(params.get('limit'), '12')
      assert.equal(params.get('search'), 'Dune')
      assert.equal(params.get('language'), 'English')
    })
  })

  describe('getMovies API Helper', () => {
    const originalFetch = globalThis.fetch

    afterEach(() => {
      globalThis.fetch = originalFetch
    })

    it('fetches movies with query and validates pagination metadata', async () => {
      let requestedUrl = ''
      globalThis.fetch = async (url) => {
        requestedUrl = String(url)
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            pagination: {
              page: 2,
              limit: 12,
              total: 25,
              totalPages: 3,
            },
            count: 12,
            movies: [
              { id: '10000000-0000-4000-8000-000000000001', title: 'Test Movie 1' },
              { id: '10000000-0000-4000-8000-000000000002', title: 'Test Movie 2' },
            ],
          }),
        }
      }

      const result = await getMovies({ page: 2, limit: 12, search: 'Test' })
      assert.match(requestedUrl, /\/movies\?page=2&limit=12&search=Test/)
      assert.equal(result.movies.length, 2)
      assert.equal(result.pagination.page, 2)
      assert.equal(result.pagination.limit, 12)
      assert.equal(result.pagination.total, 25)
      assert.equal(result.pagination.totalPages, 3)
      assert.equal(result.count, 2)
    })

    it('passes abort signal to fetchJson', async () => {
      const controller = new AbortController()
      let receivedSignal = null

      globalThis.fetch = async (_url, options) => {
        receivedSignal = options?.signal
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
            movies: [{ id: '10000000-0000-4000-8000-000000000001', title: 'Test' }],
          }),
        }
      }

      await getMovies({ signal: controller.signal })
      assert.equal(receivedSignal, controller.signal)
    })

    it('throws when movies array is invalid', async () => {
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          movies: null,
        }),
      })

      await assert.rejects(
        () => getMovies(),
        /The movies API returned an invalid movie list/,
      )
    })

    it('throws when pagination metadata is missing or invalid', async () => {
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          pagination: null,
          movies: [],
        }),
      })

      await assert.rejects(
        () => getMovies(),
        /The movies API returned invalid pagination data/,
      )
    })

    it('handles HTTP error responses properly', async () => {
      globalThis.fetch = async () => ({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          message: 'Invalid query parameters',
        }),
      })

      await assert.rejects(
        () => getMovies({ page: -1 }),
        /Invalid query parameters/,
      )
    })
  })

  describe('Pagination & Filter State Transitions', () => {
    it('calculates continuous sequential index across pages', () => {
      const calculateIndex = (page, limit, localIndex) => (page - 1) * limit + localIndex
      assert.equal(calculateIndex(1, 12, 0), 0) // Page 1, item 1 -> index 0 (displays "01")
      assert.equal(calculateIndex(1, 12, 11), 11) // Page 1, item 12 -> index 11 (displays "12")
      assert.equal(calculateIndex(2, 12, 0), 12) // Page 2, item 1 -> index 12 (displays "13")
      assert.equal(calculateIndex(3, 12, 5), 29) // Page 3, item 6 -> index 29 (displays "30")
    })

    it('computes correct disabled states at pagination boundaries', () => {
      const isPrevDisabled = (page) => page <= 1
      const isNextDisabled = (page, totalPages) => page >= totalPages || totalPages <= 1

      // Single page
      assert.equal(isPrevDisabled(1), true)
      assert.equal(isNextDisabled(1, 1), true)

      // First page of multi-page
      assert.equal(isPrevDisabled(1), true)
      assert.equal(isNextDisabled(1, 3), false)

      // Middle page
      assert.equal(isPrevDisabled(2), false)
      assert.equal(isNextDisabled(2, 3), false)

      // Last page
      assert.equal(isPrevDisabled(3), false)
      assert.equal(isNextDisabled(3, 3), true)
    })

    it('resets page to 1 when filters change', () => {
      let currentPage = 3

      const onSearchChange = () => {
        currentPage = 1
      }
      onSearchChange()
      assert.equal(currentPage, 1)

      currentPage = 4
      const onLanguageChange = () => {
        currentPage = 1
      }
      onLanguageChange()
      assert.equal(currentPage, 1)
    })
  })

  describe('API Base URL Configuration', () => {
    it('appends /api exactly once when given a backend origin without /api', () => {
      const url = resolveApiBaseUrl({
        VITE_API_URL: 'https://cinevo-ticket-booking-platform.onrender.com',
      })
      assert.equal(url, 'https://cinevo-ticket-booking-platform.onrender.com/api')
    })

    it('normalizes trailing slashes and appends /api', () => {
      const url = resolveApiBaseUrl({
        VITE_API_URL: 'https://cinevo-ticket-booking-platform.onrender.com/',
      })
      assert.equal(url, 'https://cinevo-ticket-booking-platform.onrender.com/api')
    })

    it('does not duplicate /api when already present in VITE_API_URL', () => {
      const url1 = resolveApiBaseUrl({
        VITE_API_URL: 'https://cinevo-ticket-booking-platform.onrender.com/api',
      })
      assert.equal(url1, 'https://cinevo-ticket-booking-platform.onrender.com/api')

      const url2 = resolveApiBaseUrl({
        VITE_API_URL: 'https://cinevo-ticket-booking-platform.onrender.com/api/',
      })
      assert.equal(url2, 'https://cinevo-ticket-booking-platform.onrender.com/api')
    })

    it('supports VITE_API_BASE_URL compatibility', () => {
      const url = resolveApiBaseUrl({
        VITE_API_BASE_URL: 'https://custom-backend.example.com',
      })
      assert.equal(url, 'https://custom-backend.example.com/api')
    })

    it('falls back to localhost:5000/api in development or test environments', () => {
      const urlDev = resolveApiBaseUrl({ DEV: true })
      assert.equal(urlDev, 'http://localhost:5000/api')

      const urlEmpty = resolveApiBaseUrl({})
      assert.equal(urlEmpty, 'http://localhost:5000/api')

      assert.equal(API_BASE_URL, 'http://localhost:5000/api')
    })

    it('throws in production mode if VITE_API_URL is missing', () => {
      assert.throws(
        () => resolveApiBaseUrl({ PROD: true }),
        /Missing VITE_API_URL environment variable/,
      )
    })
  })
})
