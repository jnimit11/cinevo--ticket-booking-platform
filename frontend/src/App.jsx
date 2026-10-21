
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { authenticate, cancelExistingBooking, createBooking, createDashboardCinema, createDashboardMovie, createDashboardScreen, createDashboardShowtime, generateDashboardSeats, getDashboardCinemas, getDashboardMovies, getDashboardShowtimes, getMovieById, getMovies, getMyBookings, getSeatsForShowtime, getShowtimesByMovieId } from './lib/api'
import './App.css'

function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return ''

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return hours ? `${hours}h ${remainingMinutes}m` : `${minutes} min`
}

function getReleaseYear(releaseDate) {
  if (!releaseDate) return ''

  const year = new Date(releaseDate).getUTCFullYear()
  return Number.isNaN(year) ? '' : String(year)
}

function formatReleaseDate(releaseDate) {
  if (!releaseDate) return ''

  const date = new Date(releaseDate)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatShowtimeDateTime(startsAt) {
  if (!startsAt) return ''

  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatTicketPrice(priceInPaise) {
  if (!Number.isFinite(priceInPaise) || priceInPaise < 0) return ''

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'INR',
  }).format(priceInPaise / 100)
}

function getSeatLabel(seat) {
  return `${seat.rowLabel}${seat.seatNumber}`
}

const MAX_BOOKING_SEATS = 12

function AuthForm({ onAuthenticated, message = '', initialMode = 'login', onModeChange }) {
  const [authMode, setAuthMode] = useState(initialMode)
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authStatus, setAuthStatus] = useState('idle')
  const [authError, setAuthError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const idPrefix = useId()

  async function submitAuthentication(event) {
    event.preventDefault()
    setAuthError('')

    if (authMode === 'register' && authForm.name.trim().length < 2) {
      setAuthError('Name must contain at least 2 non-space characters.')
      return
    }

    setAuthStatus('loading')

    try {
      const session = await authenticate({
        ...authForm,
        name: authForm.name.trim(),
        email: authForm.email.trim(),
      }, authMode)
      onAuthenticated(session)
      setAuthForm({ name: '', email: '', password: '' })
      setAuthStatus('idle')
    } catch (error) {
      setAuthError(error.message || 'Unable to authenticate.')
      setAuthStatus('error')
    }
  }

  return (
    <form className="auth-panel" onSubmit={submitAuthentication}>
      <div className="auth-panel-heading">
        <div>
          <span className="section-kicker">ACCOUNT REQUIRED</span>
          <h3>{authMode === 'login' ? 'Sign in to continue' : 'Create your Cinevo account'}</h3>
        </div>
        <button
          className="auth-mode-toggle"
          type="button"
          onClick={() => {
            const nextMode = authMode === 'login' ? 'register' : 'login'
            setAuthMode(nextMode)
            onModeChange?.(nextMode)
            setAuthError('')
          }}
        >
          {authMode === 'login' ? 'Create account' : 'I have an account'}
        </button>
      </div>
      {authMode === 'register' && (
        <label className="auth-field">
          Name
          <input
            id={`${idPrefix}-name`}
            name="name"
            type="text"
            autoComplete="name"
            minLength="2"
            maxLength="100"
            required
            value={authForm.name}
            onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
          />
        </label>
      )}
      <label className="auth-field">
        Email
        <input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          autoComplete="email"
          maxLength="255"
          required
          value={authForm.email}
          onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
        />
      </label>
      <div className="auth-field">
        <label htmlFor={`${idPrefix}-password`}>Password</label>
        <div className="password-input-row">
          <input
            id={`${idPrefix}-password`}
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
            minLength={authMode === 'register' ? 8 : 1}
            maxLength="72"
            required
            value={authForm.password}
            onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
          />
          <button
            className="password-visibility-button"
            type="button"
            aria-controls={`${idPrefix}-password`}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? 'Hide' : 'Show'}
            <span className="visually-hidden"> password</span>
          </button>
        </div>
        {authMode === 'register' && <small className="auth-field-hint">Use 8–72 characters.</small>}
      </div>
      {authError && <p className="auth-error" role="alert">{authError}</p>}
      {message && <p className="auth-error" role="alert">{message}</p>}
      <button className="primary-button auth-submit-button" type="submit" disabled={authStatus === 'loading'}>
        {authStatus === 'loading'
          ? 'Please wait...'
          : authMode === 'login'
            ? 'Sign in'
            : 'Create account'}
      </button>
    </form>
  )
}

function AuthPage({ mode, onAuthenticated, onModeChange, onBack }) {
  const isRegistration = mode === 'register'

  return (
    <main className="auth-page">
      <button className="secondary-button back-button" type="button" onClick={onBack}>
        ← Back
      </button>
      <div className="auth-page-heading">
        <span className="section-kicker">{isRegistration ? 'YOUR NEXT MOVIE NIGHT STARTS HERE' : 'WELCOME BACK TO CINEVO'}</span>
        <h1>{isRegistration ? 'Create your account.' : 'Sign in to Cinevo.'}</h1>
        <p>{isRegistration
          ? 'Create an account to book screenings and manage your reservations.'
          : 'Sign in to continue to your bookings and saved screenings.'}</p>
      </div>
      <AuthForm
        key={mode}
        initialMode={mode}
        onAuthenticated={onAuthenticated}
        onModeChange={onModeChange}
      />
    </main>
  )
}

function SeatSelection({ showtime, authSession, onAuthenticated, onAuthenticationExpired, onBack }) {
  const [seats, setSeats] = useState([])
  const [selectedSeatIds, setSelectedSeatIds] = useState(() => new Set())
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [showAuthForm, setShowAuthForm] = useState(false)
  const [authError, setAuthError] = useState('')
  const [bookingStatus, setBookingStatus] = useState('idle')
  const [bookingError, setBookingError] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const bookingInFlight = useRef(false)

  useEffect(() => {
    const controller = new AbortController()

    getSeatsForShowtime(showtime.id, { signal: controller.signal })
      .then((loadedSeats) => {
        setSeats(loadedSeats)
        setSelectedSeatIds(new Set())
        setStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setErrorMessage(error.message || 'Unable to load this seat layout.')
        setStatus('error')
      })

    return () => controller.abort()
  }, [showtime.id, loadAttempt])

  const seatsByRow = useMemo(() => {
    const rows = new Map()
    seats.forEach((seat) => {
      if (!rows.has(seat.rowLabel)) rows.set(seat.rowLabel, [])
      rows.get(seat.rowLabel).push(seat)
    })
    return rows
  }, [seats])

  const selectedSeats = seats.filter((seat) => selectedSeatIds.has(seat.id))
  const ticketPrice = showtime.priceInPaise
  const totalPrice = Number.isFinite(ticketPrice) && ticketPrice >= 0
    ? ticketPrice * selectedSeats.length
    : null

  function toggleSeat(seat) {
    if (
      seat.status !== 'available' ||
      (!selectedSeatIds.has(seat.id) && selectedSeatIds.size >= MAX_BOOKING_SEATS)
    ) return

    setSelectedSeatIds((current) => {
      const next = new Set(current)
      if (next.has(seat.id)) {
        next.delete(seat.id)
      } else {
        next.add(seat.id)
      }
      return next
    })
  }

  function retryLoading() {
    setSeats([])
    setSelectedSeatIds(new Set())
    setErrorMessage('')
    setStatus('loading')
    setLoadAttempt((attempt) => attempt + 1)
  }

  async function submitBooking() {
    if (!authSession?.token) {
      setShowAuthForm(true)
      setAuthError('Sign in or create an account before booking.')
      return
    }

    if (selectedSeatIds.size === 0 || bookingInFlight.current) return

    bookingInFlight.current = true
    setBookingStatus('loading')
    setBookingError('')

    try {
      const result = await createBooking(
        { showtimeId: showtime.id, seatIds: [...selectedSeatIds] },
        authSession.token,
      )
      setConfirmation(result)
      setBookingStatus('success')
    } catch (error) {
      if (error.status === 401) {
        onAuthenticationExpired()
        setShowAuthForm(true)
        setAuthError('Your sign-in has expired. Please sign in again.')
      }

      if (error.status === 409) {
        setBookingError('One or more selected seats are no longer available. Seat availability has been refreshed.')
        try {
          const refreshedSeats = await getSeatsForShowtime(showtime.id)
          setSeats(refreshedSeats)
          setSelectedSeatIds((current) => new Set(
            [...current].filter((seatId) =>
              refreshedSeats.some((seat) => seat.id === seatId && seat.status === 'available'),
            ),
          ))
        } catch (refreshError) {
          setBookingError(`The selected seats may no longer be available. Refresh failed: ${refreshError.message}`)
        }
      } else if (error.status !== 401) {
        setBookingError(error.message || 'Unable to create the booking.')
      }

      setBookingStatus('error')
    } finally {
      bookingInFlight.current = false
    }
  }

  const confirmationSeatIds = new Set(
    confirmation?.seats?.map((seat) => seat.seatId) ?? [],
  )
  const confirmedSeats = seats.filter((seat) => confirmationSeatIds.has(seat.id))

  return (
    <section className="seat-selection" aria-labelledby="seat-selection-heading">
      <button className="secondary-button back-button" onClick={onBack}>← Back to showtimes</button>
      <div className="seat-selection-heading">
        <span className="section-kicker">{showtime.cinemaName}{showtime.city ? ` · ${showtime.city}` : ''}</span>
        <h3 id="seat-selection-heading">Select your seats</h3>
        {showtime.startsAt && (
          <p>{formatShowtimeDateTime(showtime.startsAt)}{showtime.screenName ? ` · ${showtime.screenName}` : ''}</p>
        )}
      </div>

      {status === 'loading' ? (
        <div className="empty-state showtimes-state" role="status">
          <h3>Loading seat layout...</h3>
          <p>Checking availability for this screening.</p>
        </div>
      ) : status === 'error' ? (
        <div className="empty-state showtimes-state" role="alert">
          <h3>We couldn’t load seats</h3>
          <p>{errorMessage}</p>
          <button className="secondary-button" onClick={retryLoading}>Try again</button>
        </div>
      ) : seats.length === 0 ? (
        <div className="empty-state showtimes-state">
          <h3>No seat layout available</h3>
          <p>This screening does not have any seats listed.</p>
        </div>
      ) : confirmation ? (
        <div className="booking-confirmation" role="status">
          <span className="section-kicker">BOOKING CONFIRMED</span>
          <h3>Your seats are reserved</h3>
          <p className="booking-reference">Booking ID: <strong>{confirmation.booking.id}</strong></p>
          <div className="booking-confirmation-details">
            <div>
              <span className="section-kicker">SHOWTIME</span>
              <p>{showtime.cinemaName}{showtime.city ? ` · ${showtime.city}` : ''}</p>
              <p>{formatShowtimeDateTime(showtime.startsAt)}{showtime.screenName ? ` · ${showtime.screenName}` : ''}</p>
            </div>
            <div>
              <span className="section-kicker">SEATS</span>
              <p>{confirmedSeats.length ? confirmedSeats.map(getSeatLabel).join(', ') : 'Seat labels unavailable'}</p>
            </div>
            {Number.isFinite(confirmation.booking.totalAmountInPaise) && (
              <div>
                <span className="section-kicker">TOTAL</span>
                <p>{formatTicketPrice(confirmation.booking.totalAmountInPaise)}</p>
              </div>
            )}
          </div>
          <p className="booking-payment-note">Payment has not been collected.</p>
        </div>
      ) : (
        <>
          <div className="seat-map-panel">
            <div className="screen-indicator"><span /> SCREEN <span /></div>
            <div className="seat-legend" aria-label="Seat availability legend">
              <span><i className="seat-legend-seat available" /> Available</span>
              <span><i className="seat-legend-seat selected" /> Selected</span>
              <span><i className="seat-legend-seat unavailable" /> Unavailable</span>
            </div>
            <div className="seat-rows">
              {[...seatsByRow.entries()].map(([rowLabel, rowSeats]) => (
                <div className="seat-row" key={rowLabel}>
                  <span className="seat-row-label">{rowLabel}</span>
                  <div className="seat-row-items">
                    {rowSeats.map((seat) => {
                      const isSelected = selectedSeatIds.has(seat.id)
                      const isAvailable = seat.status === 'available'
                      const selectionLimitReached = !isSelected &&
                        selectedSeatIds.size >= MAX_BOOKING_SEATS
                      const seatClass = isSelected
                        ? 'seat-button selected'
                        : isAvailable
                          ? `seat-button available${selectionLimitReached ? ' limit-reached' : ''}`
                          : 'seat-button unavailable'

                      return (
                        <button
                          className={seatClass}
                          key={seat.id}
                          type="button"
                          disabled={!isAvailable || selectionLimitReached}
                          aria-pressed={isSelected}
                          aria-label={`Seat ${getSeatLabel(seat)}, ${isAvailable ? (isSelected ? 'selected' : selectionLimitReached ? 'available, booking limit reached' : 'available') : 'unavailable'}, ${seat.seatType}`}
                          title={`${getSeatLabel(seat)} · ${seat.seatType}`}
                          onClick={() => toggleSeat(seat)}
                        >
                          {seat.seatNumber}
                        </button>
                      )
                    })}
                  </div>
                  <span className="seat-row-label">{rowLabel}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="seat-selection-summary" aria-live="polite">
            <div>
              <span className="section-kicker">YOUR SEATS</span>
              <p>{selectedSeats.length ? selectedSeats.map(getSeatLabel).join(', ') : 'No seats selected'}</p>
              <small>{selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'} selected</small>
              {selectedSeats.length >= MAX_BOOKING_SEATS && (
                <small>Maximum {MAX_BOOKING_SEATS} seats per booking.</small>
              )}
            </div>
            <div className="seat-total">
              <span className="section-kicker">TOTAL</span>
              <strong>{totalPrice === null ? 'Price unavailable' : formatTicketPrice(totalPrice)}</strong>
            </div>
            <button
              className="primary-button booking-submit-button"
              type="button"
              disabled={selectedSeatIds.size === 0 || bookingStatus === 'loading'}
              onClick={authSession ? submitBooking : () => {
                setShowAuthForm(true)
                setAuthError('Sign in or create an account before booking.')
              }}
            >
              {bookingStatus === 'loading'
                ? 'Creating booking...'
                : authSession
                  ? 'Book Selected Seats'
                  : 'Continue to Booking'}
            </button>
          </div>
          {bookingError && <div className="notice booking-error" role="alert">{bookingError}</div>}
          {!authSession && showAuthForm && (
            <AuthForm
              key={authError}
              onAuthenticated={(session) => {
                onAuthenticated(session)
                setAuthError('')
                setShowAuthForm(false)
              }}
              message={authError}
            />
          )}
        </>
      )}
    </section>
  )
}

function getMovieIdFromHash() {
  const match = window.location.hash.match(/^#movie\/(.+)$/)
  if (!match) return null

  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

function getAuthModeFromHash() {
  if (window.location.hash === '#signin') return 'login'
  if (window.location.hash === '#register') return 'register'
  return null
}

function validateMovieForm(form) {
  const errors = {}
  const title = form.title.trim()
  const language = form.language.trim()
  const duration = Number(form.durationMinutes)

  if (!title) errors.title = 'Enter a movie title.'
  else if (title.length > 200) errors.title = 'Title must be 200 characters or fewer.'

  if (!form.durationMinutes || !Number.isInteger(duration) || duration <= 0 || duration > 1000) {
    errors.durationMinutes = 'Duration must be a positive whole number between 1 and 1,000 minutes.'
  }

  if (!language) errors.language = 'Enter the movie language.'
  else if (language.length > 50) errors.language = 'Language must be 50 characters or fewer.'

  if (form.releaseDate) {
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(form.releaseDate)
    const date = dateMatch ? new Date(`${form.releaseDate}T00:00:00.000Z`) : null
    if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== form.releaseDate) {
      errors.releaseDate = 'Enter a valid release date.'
    }
  }

  if (form.posterUrl.trim()) {
    try {
      new URL(form.posterUrl.trim())
    } catch {
      errors.posterUrl = 'Enter a valid poster URL.'
    }
  }

  return errors
}

function AddMovieForm({ token, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    durationMinutes: '',
    language: '',
    description: '',
    releaseDate: '',
    posterUrl: '',
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [apiError, setApiError] = useState('')
  const [createdTitle, setCreatedTitle] = useState('')
  const submissionInFlight = useRef(false)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setApiError('')
    setStatus((current) => current === 'error' ? 'idle' : current)
  }

  async function submitMovie(event) {
    event.preventDefault()
    if (submissionInFlight.current) return

    const validationErrors = validateMovieForm(form)
    setErrors(validationErrors)
    setApiError('')
    setCreatedTitle('')

    if (Object.keys(validationErrors).length) {
      setStatus('idle')
      return
    }

    setStatus('loading')

    const payload = {
      title: form.title.trim(),
      durationMinutes: Number(form.durationMinutes),
      language: form.language.trim(),
    }
    if (form.description.trim()) payload.description = form.description.trim()
    if (form.releaseDate) payload.releaseDate = form.releaseDate
    if (form.posterUrl.trim()) payload.posterUrl = form.posterUrl.trim()

    submissionInFlight.current = true
    try {
      const createdMovie = await createDashboardMovie(payload, token)
      onCreated(createdMovie)
      setCreatedTitle(createdMovie.title)
      setForm({
        title: '',
        durationMinutes: '',
        language: '',
        description: '',
        releaseDate: '',
        posterUrl: '',
      })
      setStatus('success')
    } catch (error) {
      setApiError(error.message || 'Unable to create the movie.')
      setStatus('error')
    } finally {
      submissionInFlight.current = false
    }
  }

  return (
    <form className="admin-movie-form" noValidate onSubmit={submitMovie}>
      <h3>Add Movie</h3>
      <p className="admin-form-intro">Add a movie to the catalog. Fields marked required must be completed.</p>
      <div className="admin-form-grid">
        <label className="admin-form-field">
          <span>Title <span aria-hidden="true">*</span></span>
          <input name="title" value={form.title} onChange={updateField} maxLength={200} required aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'admin-movie-title-error' : undefined} />
          {errors.title && <small id="admin-movie-title-error" className="admin-field-error">{errors.title}</small>}
        </label>
        <label className="admin-form-field">
          <span>Duration (minutes) <span aria-hidden="true">*</span></span>
          <input name="durationMinutes" type="number" min="1" max="1000" step="1" value={form.durationMinutes} onChange={updateField} required aria-invalid={Boolean(errors.durationMinutes)} aria-describedby={errors.durationMinutes ? 'admin-movie-duration-error' : undefined} />
          {errors.durationMinutes && <small id="admin-movie-duration-error" className="admin-field-error">{errors.durationMinutes}</small>}
        </label>
        <label className="admin-form-field">
          <span>Language <span aria-hidden="true">*</span></span>
          <input name="language" value={form.language} onChange={updateField} maxLength={50} required aria-invalid={Boolean(errors.language)} aria-describedby={errors.language ? 'admin-movie-language-error' : undefined} />
          {errors.language && <small id="admin-movie-language-error" className="admin-field-error">{errors.language}</small>}
        </label>
        <label className="admin-form-field">
          <span>Release date</span>
          <input name="releaseDate" type="date" value={form.releaseDate} onChange={updateField} aria-invalid={Boolean(errors.releaseDate)} aria-describedby={errors.releaseDate ? 'admin-movie-date-error' : undefined} />
          {errors.releaseDate && <small id="admin-movie-date-error" className="admin-field-error">{errors.releaseDate}</small>}
        </label>
        <label className="admin-form-field admin-form-wide">
          <span>Poster URL</span>
          <input name="posterUrl" type="url" value={form.posterUrl} onChange={updateField} aria-invalid={Boolean(errors.posterUrl)} aria-describedby={errors.posterUrl ? 'admin-movie-poster-error' : undefined} />
          {errors.posterUrl && <small id="admin-movie-poster-error" className="admin-field-error">{errors.posterUrl}</small>}
        </label>
        <label className="admin-form-field admin-form-wide">
          <span>Description</span>
          <textarea name="description" value={form.description} onChange={updateField} rows="3" />
        </label>
      </div>
      {apiError && <p className="admin-form-error" role="alert">{apiError}</p>}
      {status === 'success' && <p className="admin-form-success" role="status">“{createdTitle}” was added to the movie catalog.</p>}
      <button className="primary-button admin-submit-button" type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Adding movie...' : 'Add Movie'}
      </button>
    </form>
  )
}

function validateCinemaForm(form) {
  const errors = {}
  const name = form.name.trim()
  const address = form.address.trim()
  const city = form.city.trim()
  const state = form.state.trim()
  const postalCode = form.postalCode.trim()

  if (!name) errors.name = 'Enter a cinema name.'
  else if (name.length > 200) errors.name = 'Name must be 200 characters or fewer.'
  if (!address) errors.address = 'Enter an address.'
  if (!city) errors.city = 'Enter a city.'
  else if (city.length > 100) errors.city = 'City must be 100 characters or fewer.'
  if (!state) errors.state = 'Enter a state.'
  else if (state.length > 100) errors.state = 'State must be 100 characters or fewer.'
  if (postalCode.length > 10) errors.postalCode = 'Postal code must be 10 characters or fewer.'

  return errors
}

function AddCinemaForm({ token, onCreated }) {
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '', postalCode: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [apiError, setApiError] = useState('')
  const [createdName, setCreatedName] = useState('')
  const submissionInFlight = useRef(false)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setApiError('')
    setStatus((current) => current === 'error' ? 'idle' : current)
  }

  async function submitCinema(event) {
    event.preventDefault()
    if (submissionInFlight.current) return

    const validationErrors = validateCinemaForm(form)
    setErrors(validationErrors)
    setApiError('')
    setCreatedName('')
    if (Object.keys(validationErrors).length) {
      setStatus('idle')
      return
    }

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
    }
    if (form.postalCode.trim()) payload.postalCode = form.postalCode.trim()

    submissionInFlight.current = true
    setStatus('loading')
    try {
      const createdCinema = await createDashboardCinema(payload, token)
      setCreatedName(createdCinema.name)
      setForm({ name: '', address: '', city: '', state: '', postalCode: '' })
      setStatus('success')
      onCreated(createdCinema)
    } catch (error) {
      setApiError(error.message || 'Unable to create the cinema.')
      setStatus('error')
    } finally {
      submissionInFlight.current = false
    }
  }

  return (
    <form className="admin-movie-form" noValidate onSubmit={submitCinema}>
      <h3>Add Cinema</h3>
      <p className="admin-form-intro">Add a cinema location. Fields marked required must be completed.</p>
      <div className="admin-form-grid">
        <label className="admin-form-field">
          <span>Name <span aria-hidden="true">*</span></span>
          <input name="name" value={form.name} onChange={updateField} maxLength={200} required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'admin-cinema-name-error' : undefined} />
          {errors.name && <small id="admin-cinema-name-error" className="admin-field-error">{errors.name}</small>}
        </label>
        <label className="admin-form-field">
          <span>Address <span aria-hidden="true">*</span></span>
          <input name="address" value={form.address} onChange={updateField} required aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? 'admin-cinema-address-error' : undefined} />
          {errors.address && <small id="admin-cinema-address-error" className="admin-field-error">{errors.address}</small>}
        </label>
        <label className="admin-form-field">
          <span>City <span aria-hidden="true">*</span></span>
          <input name="city" value={form.city} onChange={updateField} maxLength={100} required aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'admin-cinema-city-error' : undefined} />
          {errors.city && <small id="admin-cinema-city-error" className="admin-field-error">{errors.city}</small>}
        </label>
        <label className="admin-form-field">
          <span>State <span aria-hidden="true">*</span></span>
          <input name="state" value={form.state} onChange={updateField} maxLength={100} required aria-invalid={Boolean(errors.state)} aria-describedby={errors.state ? 'admin-cinema-state-error' : undefined} />
          {errors.state && <small id="admin-cinema-state-error" className="admin-field-error">{errors.state}</small>}
        </label>
        <label className="admin-form-field">
          <span>Postal code</span>
          <input name="postalCode" value={form.postalCode} onChange={updateField} maxLength={10} aria-invalid={Boolean(errors.postalCode)} aria-describedby={errors.postalCode ? 'admin-cinema-postal-error' : undefined} />
          {errors.postalCode && <small id="admin-cinema-postal-error" className="admin-field-error">{errors.postalCode}</small>}
        </label>
      </div>
      {apiError && <p className="admin-form-error" role="alert">{apiError}</p>}
      {status === 'success' && <p className="admin-form-success" role="status">“{createdName}” was added to the cinema list. Refreshing the list…</p>}
      <button className="primary-button admin-submit-button" type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Adding cinema...' : 'Add Cinema'}
      </button>
    </form>
  )
}

function ScreenManagementSection({ token, screensCreatedThisSession, setScreensCreatedThisSession }) {
  const [cinemas, setCinemas] = useState([])
  const [cinemaStatus, setCinemaStatus] = useState('loading')
  const [cinemaError, setCinemaError] = useState('')
  const [cinemaLoadAttempt, setCinemaLoadAttempt] = useState(0)
  const [screenForm, setScreenForm] = useState({ cinemaId: '', name: '', totalSeats: '' })
  const [screenErrors, setScreenErrors] = useState({})
  const [screenStatus, setScreenStatus] = useState('idle')
  const [screenError, setScreenError] = useState('')
  const [selectedScreenId, setSelectedScreenId] = useState('')
  const [seatForm, setSeatForm] = useState({ rows: '', seatsPerRow: '', seatType: 'regular' })
  const [seatErrors, setSeatErrors] = useState({})
  const [seatStatus, setSeatStatus] = useState('idle')
  const [seatError, setSeatError] = useState('')
  const [seatSuccess, setSeatSuccess] = useState('')
  const [confirmSeatWrite, setConfirmSeatWrite] = useState(false)
  const screenRequestInFlight = useRef(false)
  const seatRequestInFlight = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    getDashboardCinemas({ signal: controller.signal })
      .then((loadedCinemas) => {
        setCinemas(loadedCinemas)
        setCinemaStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setCinemaError(error.message || 'Unable to load cinemas for the screen form.')
        setCinemaStatus('error')
      })

    return () => controller.abort()
  }, [cinemaLoadAttempt])

  const selectedScreen = screensCreatedThisSession.find((screen) => screen.id === selectedScreenId)

  function retryCinemaLoad() {
    setCinemaError('')
    setCinemaStatus('loading')
    setCinemaLoadAttempt((attempt) => attempt + 1)
  }

  async function submitScreen(event) {
    event.preventDefault()
    if (screenRequestInFlight.current) return

    const errors = {}
    const name = screenForm.name.trim()
    const totalSeats = Number(screenForm.totalSeats)
    if (!screenForm.cinemaId || !cinemas.some((cinema) => cinema.id === screenForm.cinemaId)) {
      errors.cinemaId = 'Select a cinema from the list.'
    }
    if (!name) errors.name = 'Enter a screen name.'
    else if (name.length > 100) errors.name = 'Screen name must be 100 characters or fewer.'
    if (!screenForm.totalSeats || !Number.isInteger(totalSeats) || totalSeats <= 0 || totalSeats > 1000) {
      errors.totalSeats = 'Total seats must be a positive whole number between 1 and 1,000.'
    }
    setScreenErrors(errors)
    setScreenError('')
    if (Object.keys(errors).length) {
      setScreenStatus('idle')
      return
    }

    screenRequestInFlight.current = true
    setScreenStatus('loading')
    try {
      const screen = await createDashboardScreen({
        cinemaId: screenForm.cinemaId,
        name,
        totalSeats,
      }, token)
      const createdScreen = {
        ...screen,
        totalSeats,
        cinemaId: screenForm.cinemaId,
        cinemaName: cinemas.find((cinema) => cinema.id === screenForm.cinemaId)?.name || '',
      }
      setScreensCreatedThisSession((current) => [
        createdScreen,
        ...current.filter((item) => item.id !== createdScreen.id),
      ])
      setSelectedScreenId(createdScreen.id)
      setScreenForm({ cinemaId: screenForm.cinemaId, name: '', totalSeats: '' })
      setScreenStatus('success')
      setSeatForm({ rows: '', seatsPerRow: '', seatType: 'regular' })
      setSeatErrors({})
      setSeatError('')
      setSeatSuccess('')
      setConfirmSeatWrite(false)
    } catch (error) {
      setScreenError(error.message || 'Unable to create the screen.')
      setScreenStatus('error')
    } finally {
      screenRequestInFlight.current = false
    }
  }

  async function submitSeatGeneration(event) {
    event.preventDefault()
    if (seatRequestInFlight.current || !selectedScreen || selectedScreen.seatsGenerated) return

    const rows = Number(seatForm.rows)
    const seatsPerRow = Number(seatForm.seatsPerRow)
    const errors = {}
    if (!Number.isInteger(rows) || rows < 1 || rows > 10) {
      errors.rows = 'Rows must be a whole number from 1 to 10.'
    }
    if (!Number.isInteger(seatsPerRow) || seatsPerRow < 1 || seatsPerRow > 12) {
      errors.seatsPerRow = 'Seats per row must be a whole number from 1 to 12.'
    }
    if (
      Number.isInteger(rows) && Number.isInteger(seatsPerRow) &&
      rows >= 1 && rows <= 10 && seatsPerRow >= 1 && seatsPerRow <= 12 &&
      rows * seatsPerRow > selectedScreen.totalSeats
    ) {
      errors.layout = `This layout exceeds the screen capacity of ${selectedScreen.totalSeats} seats.`
    }
    if (!confirmSeatWrite) errors.confirmation = 'Confirm that you want to write these seat records.'
    setSeatErrors(errors)
    setSeatError('')
    setSeatSuccess('')
    if (Object.keys(errors).length) {
      setSeatStatus('idle')
      return
    }

    seatRequestInFlight.current = true
    setSeatStatus('loading')
    try {
      const result = await generateDashboardSeats(selectedScreen.id, {
        rows,
        seatsPerRow,
        seatType: seatForm.seatType,
      }, token)
      setSeatSuccess(`${result.totalSeats} seat records generated for ${selectedScreen.name}.`)
      setSeatStatus('success')
      setScreensCreatedThisSession((current) => current.map((screen) =>
        screen.id === selectedScreen.id ? { ...screen, seatsGenerated: true } : screen,
      ))
    } catch (error) {
      setSeatError(error.message || 'Unable to generate seats.')
      setSeatStatus('error')
    } finally {
      seatRequestInFlight.current = false
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <span className="section-kicker">CATALOG</span>
          <h2>Screens</h2>
          <p>Create screens and generate their seat layout.</p>
        </div>
      </div>
      <p className="admin-capability">No screen-list endpoint exists. Screens below are only those created during this dashboard session and are not restored after reload.</p>
      <form className="admin-movie-form" noValidate onSubmit={submitScreen}>
        <h3>Create Screen</h3>
        <div className="admin-form-grid">
          <label className="admin-form-field admin-form-wide">
            <span>Cinema <span aria-hidden="true">*</span></span>
            <select
              name="cinemaId"
              value={screenForm.cinemaId}
              onChange={(event) => {
                setScreenForm((current) => ({ ...current, cinemaId: event.target.value }))
                setScreenErrors((current) => ({ ...current, cinemaId: '' }))
                setScreenError('')
              }}
              disabled={cinemaStatus !== 'success' || screenStatus === 'loading'}
              required
              aria-invalid={Boolean(screenErrors.cinemaId)}
            >
              <option value="">Select a cinema</option>
              {cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name} — {cinema.city}</option>)}
            </select>
            {cinemaStatus === 'loading' && <small>Loading cinemas…</small>}
            {cinemaStatus === 'error' && (
              <small className="admin-field-error" role="alert">{cinemaError} <button className="admin-inline-retry" type="button" onClick={retryCinemaLoad}>Retry</button></small>
            )}
            {cinemaStatus === 'success' && cinemas.length === 0 && <small>No cinemas are available. Add a cinema before creating a screen.</small>}
            {screenErrors.cinemaId && <small className="admin-field-error">{screenErrors.cinemaId}</small>}
          </label>
          <label className="admin-form-field">
            <span>Screen name <span aria-hidden="true">*</span></span>
            <input name="name" value={screenForm.name} onChange={(event) => {
              setScreenForm((current) => ({ ...current, name: event.target.value }))
              setScreenErrors((current) => ({ ...current, name: '' }))
              setScreenError('')
            }} maxLength={100} required aria-invalid={Boolean(screenErrors.name)} />
            {screenErrors.name && <small className="admin-field-error">{screenErrors.name}</small>}
          </label>
          <label className="admin-form-field">
            <span>Total seats <span aria-hidden="true">*</span></span>
            <input name="totalSeats" type="number" min="1" max="1000" step="1" value={screenForm.totalSeats} onChange={(event) => {
              setScreenForm((current) => ({ ...current, totalSeats: event.target.value }))
              setScreenErrors((current) => ({ ...current, totalSeats: '' }))
              setScreenError('')
            }} required aria-invalid={Boolean(screenErrors.totalSeats)} />
            {screenErrors.totalSeats && <small className="admin-field-error">{screenErrors.totalSeats}</small>}
          </label>
        </div>
        {screenError && <p className="admin-form-error" role="alert">{screenError}</p>}
        {screenStatus === 'success' && <p className="admin-form-success" role="status">Screen created. It is available for seat generation until this dashboard session ends.</p>}
        <button className="primary-button admin-submit-button" type="submit" disabled={screenStatus === 'loading' || cinemaStatus !== 'success' || cinemas.length === 0}>
          {screenStatus === 'loading' ? 'Creating screen...' : 'Create Screen'}
        </button>
      </form>
      {screensCreatedThisSession.length > 0 && (
        <ul className="admin-item-list admin-created-screens">
          {screensCreatedThisSession.map((screen) => {
            const cinema = cinemas.find((item) => item.id === screen.cinemaId)
            return (
              <li className="admin-item" key={screen.id}>
                <strong>{screen.name}</strong>
                <span>{cinema?.name || 'Cinema'} · Capacity {screen.totalSeats}</span>
                {screen.seatsGenerated && <span>Seats generated</span>}
              </li>
            )
          })}
        </ul>
      )}
      <form className="admin-movie-form" noValidate onSubmit={submitSeatGeneration}>
        <h3>Generate Seats</h3>
        <p className="admin-form-intro">Seat generation writes seat records to the database and cannot be undone from this dashboard.</p>
        <div className="admin-form-grid">
          <label className="admin-form-field admin-form-wide">
            <span>Screen <span aria-hidden="true">*</span></span>
            <select value={selectedScreenId} onChange={(event) => {
              setSelectedScreenId(event.target.value)
              setSeatError('')
              setSeatSuccess('')
              setSeatErrors({})
              setConfirmSeatWrite(false)
            }}>
              <option value="">Select a screen created this session</option>
              {screensCreatedThisSession.map((screen) => (
                <option key={screen.id} value={screen.id} disabled={screen.seatsGenerated}>{screen.name} ({screen.totalSeats} seats){screen.seatsGenerated ? ' — seats generated' : ''}</option>
              ))}
            </select>
            {!screensCreatedThisSession.length && <small>Create a screen above to make it available here.</small>}
            {selectedScreen?.seatsGenerated && <small>Seats have already been generated for this screen.</small>}
          </label>
          <label className="admin-form-field">
            <span>Rows (1–10) <span aria-hidden="true">*</span></span>
            <input type="number" min="1" max="10" step="1" value={seatForm.rows} onChange={(event) => {
              setSeatForm((current) => ({ ...current, rows: event.target.value }))
              setSeatErrors((current) => ({ ...current, rows: '', layout: '' }))
              setSeatError('')
            }} aria-invalid={Boolean(seatErrors.rows || seatErrors.layout)} disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === 'loading'} />
            {seatErrors.rows && <small className="admin-field-error">{seatErrors.rows}</small>}
          </label>
          <label className="admin-form-field">
            <span>Seats per row (1–12) <span aria-hidden="true">*</span></span>
            <input type="number" min="1" max="12" step="1" value={seatForm.seatsPerRow} onChange={(event) => {
              setSeatForm((current) => ({ ...current, seatsPerRow: event.target.value }))
              setSeatErrors((current) => ({ ...current, seatsPerRow: '', layout: '' }))
              setSeatError('')
            }} aria-invalid={Boolean(seatErrors.seatsPerRow || seatErrors.layout)} disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === 'loading'} />
            {seatErrors.seatsPerRow && <small className="admin-field-error">{seatErrors.seatsPerRow}</small>}
          </label>
          <label className="admin-form-field">
            <span>Seat type</span>
            <select value={seatForm.seatType} onChange={(event) => setSeatForm((current) => ({ ...current, seatType: event.target.value }))} disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === 'loading'}>
              <option value="regular">Regular</option>
              <option value="premium">Premium</option>
              <option value="recliner">Recliner</option>
            </select>
          </label>
        </div>
        {seatErrors.layout && <p className="admin-field-error">{seatErrors.layout}</p>}
        <label className="admin-confirm-field">
          <input type="checkbox" checked={confirmSeatWrite} onChange={(event) => {
            setConfirmSeatWrite(event.target.checked)
            setSeatErrors((current) => ({ ...current, confirmation: '' }))
          }} disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === 'loading'} />
          I understand this will create seat records for the selected screen.
        </label>
        {seatErrors.confirmation && <p className="admin-field-error">{seatErrors.confirmation}</p>}
        {seatError && <p className="admin-form-error" role="alert">{seatError}</p>}
        {seatSuccess && <p className="admin-form-success" role="status">{seatSuccess}</p>}
        <button className="primary-button admin-submit-button" type="submit" disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === 'loading'}>
          {seatStatus === 'loading' ? 'Generating seats...' : 'Generate Seats'}
        </button>
      </form>
    </section>
  )
}

function parsePriceInPaise(value) {
  const normalized = value.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null

  const [rupees, paise = ''] = normalized.split('.')
  const significantRupees = rupees.replace(/^0+(?=\d)/, '')
  if (significantRupees.length > 15) return null
  const amount = BigInt(significantRupees) * 100n + BigInt(paise.padEnd(2, '0') || '0')
  return amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null
}

function toApiTimestamp(localDateTime) {
  const date = new Date(localDateTime)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function ShowtimeForm({ token, screens, onCreated }) {
  const [movies, setMovies] = useState([])
  const [movieStatus, setMovieStatus] = useState('loading')
  const [movieError, setMovieError] = useState('')
  const [movieLoadAttempt, setMovieLoadAttempt] = useState(0)
  const [form, setForm] = useState({
    movieId: '',
    screenId: '',
    startsAt: '',
    endsAt: '',
    priceInRupees: '',
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [apiError, setApiError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const submissionInFlight = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    getDashboardMovies({ signal: controller.signal })
      .then((loadedMovies) => {
        setMovies(loadedMovies)
        setMovieStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setMovieError(error.message || 'Unable to load movies for the showtime form.')
        setMovieStatus('error')
      })

    return () => controller.abort()
  }, [movieLoadAttempt])

  const selectedMovie = movies.find((movie) => movie.id === form.movieId)
  const selectedScreen = screens.find((screen) => screen.id === form.screenId)

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setApiError('')
    setSuccessMessage('')
    setStatus((current) => current === 'error' || current === 'success' ? 'idle' : current)
  }

  async function submitShowtime(event) {
    event.preventDefault()
    if (submissionInFlight.current) return

    const validationErrors = {}
    if (!selectedMovie) validationErrors.movieId = 'Select a movie from the catalog.'
    if (!selectedScreen) validationErrors.screenId = 'Select a screen created during this dashboard session.'

    const startsAtDate = new Date(form.startsAt)
    const endsAtDate = new Date(form.endsAt)
    const startsAt = toApiTimestamp(form.startsAt)
    const endsAt = toApiTimestamp(form.endsAt)
    if (!form.startsAt || !startsAt || Number.isNaN(startsAtDate.getTime())) {
      validationErrors.startsAt = 'Enter a valid start date and time.'
    }
    if (!form.endsAt || !endsAt || Number.isNaN(endsAtDate.getTime())) {
      validationErrors.endsAt = 'Enter a valid end date and time.'
    } else if (startsAt && endsAtDate <= startsAtDate) {
      validationErrors.endsAt = 'End time must be after start time.'
    } else if (selectedMovie && startsAt && endsAtDate - startsAtDate < selectedMovie.durationMinutes * 60_000) {
      validationErrors.endsAt = `End time must allow at least ${selectedMovie.durationMinutes} minutes for this movie.`
    }

    const priceInPaise = parsePriceInPaise(form.priceInRupees)
    if (priceInPaise === null) {
      validationErrors.priceInRupees = 'Enter a non-negative amount with no more than two decimal places.'
    } else if (priceInPaise > 10_000_000) {
      validationErrors.priceInRupees = 'Ticket price cannot exceed ₹100,000 (10,000,000 paise).'
    }

    setErrors(validationErrors)
    setApiError('')
    setSuccessMessage('')
    if (Object.keys(validationErrors).length) {
      setStatus('idle')
      return
    }

    submissionInFlight.current = true
    setStatus('loading')
    try {
      const created = await createDashboardShowtime({
        movieId: selectedMovie.id,
        screenId: selectedScreen.id,
        startsAt,
        endsAt,
        priceInPaise,
      }, token)
      const enrichedShowtime = {
        ...created,
        movieTitle: selectedMovie.title,
        durationMinutes: selectedMovie.durationMinutes,
        screenName: selectedScreen.name,
        cinemaName: selectedScreen.cinemaName || '',
      }
      onCreated(enrichedShowtime)
      setSuccessMessage(`Showtime for “${selectedMovie.title}” was created. Refreshing the list…`)
      setForm({ movieId: '', screenId: '', startsAt: '', endsAt: '', priceInRupees: '' })
      setStatus('success')
    } catch (error) {
      setApiError(error.message || 'Unable to create the showtime.')
      setStatus('error')
    } finally {
      submissionInFlight.current = false
    }
  }

  function retryMovieLoad() {
    setMovieError('')
    setMovieStatus('loading')
    setMovieLoadAttempt((attempt) => attempt + 1)
  }

  return (
    <form className="admin-movie-form" noValidate onSubmit={submitShowtime}>
      <h3>Create Showtime</h3>
      <p className="admin-form-intro">Choose a catalog movie and a screen created during this dashboard session. Screen options are not restored after reload.</p>
      <div className="admin-form-grid">
        <label className="admin-form-field admin-form-wide">
          <span>Movie <span aria-hidden="true">*</span></span>
          <select name="movieId" value={form.movieId} onChange={updateField} disabled={movieStatus !== 'success' || status === 'loading'} aria-invalid={Boolean(errors.movieId)}>
            <option value="">Select a movie</option>
            {movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title}</option>)}
          </select>
          {movieStatus === 'loading' && <small>Loading movies…</small>}
          {movieStatus === 'error' && <small className="admin-field-error" role="alert">{movieError} <button className="admin-inline-retry" type="button" onClick={retryMovieLoad}>Retry</button></small>}
          {movieStatus === 'success' && movies.length === 0 && <small>No movies are available. Add a movie before scheduling a showtime.</small>}
          {errors.movieId && <small className="admin-field-error">{errors.movieId}</small>}
        </label>
        <label className="admin-form-field admin-form-wide">
          <span>Screen <span aria-hidden="true">*</span></span>
          <select name="screenId" value={form.screenId} onChange={updateField} disabled={!screens.length || status === 'loading'} aria-invalid={Boolean(errors.screenId)}>
            <option value="">Select a screen created this session</option>
            {screens.map((screen) => <option key={screen.id} value={screen.id}>{screen.name} — {screen.cinemaName || 'Cinema'}</option>)}
          </select>
          {!screens.length && <small>No eligible screen is available. Create a screen in this dashboard session; screen options are lost after reload.</small>}
          {errors.screenId && <small className="admin-field-error">{errors.screenId}</small>}
        </label>
        <label className="admin-form-field">
          <span>Start date and time <span aria-hidden="true">*</span></span>
          <input type="datetime-local" name="startsAt" value={form.startsAt} onChange={updateField} disabled={status === 'loading'} aria-invalid={Boolean(errors.startsAt)} />
          <small>Entered in your local timezone; sent to the API as an ISO 8601 timestamp.</small>
          {errors.startsAt && <small className="admin-field-error">{errors.startsAt}</small>}
        </label>
        <label className="admin-form-field">
          <span>End date and time <span aria-hidden="true">*</span></span>
          <input type="datetime-local" name="endsAt" value={form.endsAt} onChange={updateField} disabled={status === 'loading'} aria-invalid={Boolean(errors.endsAt)} />
          {errors.endsAt && <small className="admin-field-error">{errors.endsAt}</small>}
        </label>
        <label className="admin-form-field">
          <span>Ticket price (INR) <span aria-hidden="true">*</span></span>
          <input type="text" inputMode="decimal" name="priceInRupees" value={form.priceInRupees} onChange={updateField} placeholder="e.g. 250.00" disabled={status === 'loading'} aria-invalid={Boolean(errors.priceInRupees)} />
          {errors.priceInRupees && <small className="admin-field-error">{errors.priceInRupees}</small>}
        </label>
      </div>
      {apiError && <p className="admin-form-error" role="alert">{apiError}</p>}
      {successMessage && <p className="admin-form-success" role="status">{successMessage}</p>}
      <button className="primary-button admin-submit-button" type="submit" disabled={status === 'loading' || movieStatus !== 'success' || movies.length === 0 || screens.length === 0}>
        {status === 'loading' ? 'Creating showtime...' : 'Create Showtime'}
      </button>
    </form>
  )
}

function AdminListSection({ title, description, loadItems, renderItem, token, showAddMovie = false, showAddCinema = false, showAddShowtime = false, screens = [] }) {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [createdItem, setCreatedItem] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    loadItems({ signal: controller.signal })
      .then((loadedItems) => {
        setItems(createdItem && !loadedItems.some((item) => item.id === createdItem.id)
          ? [createdItem, ...loadedItems]
          : loadedItems)
        setStatus('success')
      })
      .catch((loadError) => {
        if (controller.signal.aborted) return
        const createdLabel = createdItem?.name || createdItem?.title || createdItem?.movieTitle
        const refreshMessage = createdItem
          ? `${createdLabel ? `“${createdLabel}” was created, but ` : 'The item was created, but '}the ${title.toLowerCase()} list could not be refreshed.`
          : ''
        setError(refreshMessage ? `${refreshMessage} ${loadError.message || 'Please retry the list refresh.'}` : loadError.message || `Unable to load ${title.toLowerCase()}.`)
        setStatus('error')
      })

    return () => controller.abort()
  }, [createdItem, loadAttempt, loadItems, title])

  function retryLoading() {
    setStatus('loading')
    setError('')
    setLoadAttempt((attempt) => attempt + 1)
  }

  function handleItemCreated(item) {
    setCreatedItem(item)
    setItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)])
    setStatus('loading')
    setError('')
    setLoadAttempt((attempt) => attempt + 1)
  }

  const renderedItems = items.length ? (
    <ul className="admin-item-list">
      {items.map((item) => (
        <li className="admin-item" key={item.id}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  ) : null

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <span className="section-kicker">CATALOG</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {status === 'success' && <span className="admin-count">{items.length} listed</span>}
      </div>
      {status === 'loading' ? (
        <p className="admin-state" role="status">Loading {title.toLowerCase()}...</p>
      ) : status === 'error' ? (
        <>
          <div className="admin-state" role="alert">
            <p>{error}</p>
            <button className="secondary-button" type="button" onClick={retryLoading}>Try again</button>
          </div>
          {renderedItems}
        </>
      ) : renderedItems ? (
        renderedItems
      ) : (
        <p className="admin-state">No {title.toLowerCase()} are available.</p>
      )}
      {showAddMovie && <AddMovieForm token={token} onCreated={handleItemCreated} />}
      {showAddCinema && <AddCinemaForm token={token} onCreated={handleItemCreated} />}
      {showAddShowtime && <ShowtimeForm token={token} screens={screens} onCreated={handleItemCreated} />}
      <p className="admin-capability">
        {showAddMovie || showAddCinema || showAddShowtime
          ? 'Edit and delete endpoints are not available.'
          : 'Create endpoint exists; dashboard forms are not available. Edit and delete endpoints are not available.'}
      </p>
    </section>
  )
}

function AdminDashboard({ authSession, onBack, onSignIn }) {
  const [screensCreatedThisSession, setScreensCreatedThisSession] = useState([])

  if (!authSession) {
    return (
      <main className="admin-page">
        <button className="secondary-button back-button" type="button" onClick={onBack}>← Back to Movies</button>
        <div className="empty-state" role="status">
          <h1>Admin access required</h1>
          <p>Sign in with an administrator account to open this dashboard.</p>
          <button className="primary-button" type="button" onClick={onSignIn}>Sign in</button>
        </div>
      </main>
    )
  }

  if (authSession.user?.role !== 'admin') {
    return (
      <main className="admin-page">
        <button className="secondary-button back-button" type="button" onClick={onBack}>← Back to Movies</button>
        <div className="empty-state" role="alert">
          <h1>Admin access required</h1>
          <p>This account does not have permission to view the dashboard.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <button className="secondary-button back-button" type="button" onClick={onBack}>← Back to Movies</button>
      <header className="admin-page-heading">
        <span className="section-kicker">CINEVO MANAGEMENT</span>
        <h1>Admin Dashboard</h1>
        <p>Catalog overview from the existing Cinevo APIs.</p>
      </header>
      <div className="admin-grid">
        <AdminListSection
          title="Movies"
          description="Movie records currently in the catalog."
          loadItems={getDashboardMovies}
          token={authSession.token}
          showAddMovie
          renderItem={(movie) => (
            <>
              <strong>{movie.title}</strong>
              <span>{[movie.language, movie.durationMinutes ? `${movie.durationMinutes} min` : ''].filter(Boolean).join(' · ') || 'Movie details unavailable'}</span>
            </>
          )}
        />
        <AdminListSection
          title="Cinemas"
          description="Cinema locations registered with Cinevo."
          loadItems={getDashboardCinemas}
          renderItem={(cinema) => (
            <>
              <strong>{cinema.name}</strong>
              <span>{[cinema.city, cinema.state].filter(Boolean).join(', ') || cinema.address || 'Location details unavailable'}</span>
            </>
          )}
          token={authSession.token}
          showAddCinema
        />
        <ScreenManagementSection
          token={authSession.token}
          screensCreatedThisSession={screensCreatedThisSession}
          setScreensCreatedThisSession={setScreensCreatedThisSession}
        />
        <AdminListSection
          title="Showtimes"
          description="Scheduled screenings returned by the existing list API."
          loadItems={getDashboardShowtimes}
          token={authSession.token}
          screens={screensCreatedThisSession}
          showAddShowtime
          renderItem={(showtime) => (
            <>
              <strong>{showtime.movieTitle}</strong>
              <span>{[showtime.cinemaName, showtime.screenName].filter(Boolean).join(' · ')}</span>
              <span>{formatShowtimeDateTime(showtime.startsAt) || 'Start time unavailable'}</span>
            </>
          )}
        />
      </div>
    </main>
  )
}

function MyBookings({ authSession, onAuthenticated, onAuthenticationExpired, onBack }) {
  const [bookings, setBookings] = useState([])
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [confirmCancelId, setConfirmCancelId] = useState(null)
  const [cancelingId, setCancelingId] = useState(null)
  const [cancelError, setCancelError] = useState('')
  const [cancelNotice, setCancelNotice] = useState('')
  const cancelInFlight = useRef(false)

  useEffect(() => {
    if (!authSession?.token) return undefined

    const controller = new AbortController()

    getMyBookings(authSession.token, { signal: controller.signal })
      .then((loadedBookings) => {
        if (controller.signal.aborted) return
        setBookings(loadedBookings)
        setStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setErrorMessage(error.message || 'Unable to load your bookings.')
        setStatus('error')
        if (error.status === 401) onAuthenticationExpired()
      })

    return () => controller.abort()
  }, [authSession?.token, loadAttempt, onAuthenticationExpired])

  function retryLoading() {
    setErrorMessage('')
    setStatus('loading')
    setLoadAttempt((attempt) => attempt + 1)
  }

  function handleAuthenticated(session) {
    setStatus('loading')
    setErrorMessage('')
    onAuthenticated(session)
  }

  async function confirmCancellation(bookingId) {
    if (cancelInFlight.current) return
    cancelInFlight.current = true
    setCancelingId(bookingId)
    setCancelError('')
    setCancelNotice('')

    try {
      const result = await cancelExistingBooking(bookingId, authSession.token)
      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: result.booking.status, updatedAt: result.booking.updatedAt }
            : booking,
        ),
      )
      setCancelNotice(`Booking ${bookingId} cancelled. Its seats have been released.`)
      setConfirmCancelId(null)
    } catch (error) {
      if (error.status === 401) {
        onAuthenticationExpired()
        setErrorMessage('Your sign-in has expired. Please sign in again to view bookings.')
        setStatus('error')
      } else {
        setCancelError(error.message || 'Unable to cancel this booking.')
        if (error.status === 404 || error.status === 409) {
          setLoadAttempt((attempt) => attempt + 1)
        }
      }
    } finally {
      cancelInFlight.current = false
      setCancelingId(null)
    }
  }

  return (
    <main className="bookings-page">
      <button className="secondary-button back-button" onClick={onBack}>← Back</button>
      <div className="bookings-page-heading">
        <span className="section-kicker">YOUR CINEVO ACCOUNT</span>
        <h1>My Bookings</h1>
        <p>Your booking history and current reservation status.</p>
      </div>

      {!authSession ? (
        <div className="bookings-auth">
          <div className="empty-state">
            <h2>Sign in to view your bookings</h2>
            <p>Your booking history is available only to your account.</p>
          </div>
          <AuthForm onAuthenticated={handleAuthenticated} message={errorMessage} />
        </div>
      ) : status === 'loading' ? (
        <div className="empty-state" role="status"><h3>Loading your bookings...</h3><p>Fetching your booking history.</p></div>
      ) : status === 'error' ? (
        <div className="empty-state" role="alert">
          <h3>We couldn’t load your bookings</h3>
          <p>{errorMessage}</p>
          {authSession && <button className="secondary-button" onClick={retryLoading}>Try again</button>}
          {!authSession && <AuthForm onAuthenticated={handleAuthenticated} message={errorMessage} />}
        </div>
      ) : (
        <>
          {cancelNotice && <div className="booking-notice" role="status">{cancelNotice}</div>}
          {cancelError && <div className="notice booking-error" role="alert">{cancelError}</div>}
          {bookings.length === 0 ? (
            <div className="empty-state"><h3>No bookings yet</h3><p>When you book a screening, it will appear here.</p></div>
          ) : (
            <div className="booking-list">
              {bookings.map((booking) => {
                const isActive = booking.status === 'confirmed'
                const seatLabels = (booking.seats ?? [])
                  .map((seat) => seat.rowLabel && Number.isInteger(seat.seatNumber)
                    ? getSeatLabel(seat)
                    : null)
                  .filter(Boolean)

                return (
                  <article className="booking-card" key={booking.id}>
                    <div className="booking-card-heading">
                      <div>
                        <span className="section-kicker">BOOKING</span>
                        <h2>{booking.showtime?.movieTitle || 'Movie details unavailable'}</h2>
                      </div>
                      <span className={isActive ? 'booking-status active' : 'booking-status cancelled'}>
                        {isActive ? 'Confirmed' : 'Cancelled'}
                      </span>
                    </div>
                    <p className="booking-id">ID: {booking.id}</p>
                    <div className="booking-card-details">
                      {booking.showtime?.cinemaName && <p><strong>Cinema</strong>{booking.showtime.cinemaName}</p>}
                      {booking.showtime?.screenName && <p><strong>Screen</strong>{booking.showtime.screenName}</p>}
                      {booking.showtime?.startsAt && (
                        <p><strong>Showtime</strong>{formatShowtimeDateTime(booking.showtime.startsAt)}</p>
                      )}
                      {seatLabels.length > 0 && <p><strong>Seats</strong>{seatLabels.join(', ')}</p>}
                      {Number.isFinite(booking.totalAmountInPaise) && (
                        <p><strong>Total</strong>{formatTicketPrice(booking.totalAmountInPaise)}</p>
                      )}
                      {booking.createdAt && (
                        <p><strong>Booked</strong>{formatReleaseDate(booking.createdAt)}</p>
                      )}
                    </div>
                    {isActive && (
                      <div className="booking-card-actions">
                        {confirmCancelId === booking.id ? (
                          <div className="cancel-confirmation" role="group" aria-label="Confirm booking cancellation">
                            <span>Cancel this booking? Its seats will be released.</span>
                            <button
                              className="cancel-confirm-button"
                              type="button"
                              disabled={cancelingId === booking.id}
                              onClick={() => confirmCancellation(booking.id)}
                            >
                              {cancelingId === booking.id ? 'Cancelling...' : 'Confirm cancellation'}
                            </button>
                            <button
                              className="cancel-keep-button"
                              type="button"
                              disabled={cancelingId === booking.id}
                              onClick={() => setConfirmCancelId(null)}
                            >
                              Keep booking
                            </button>
                          </div>
                        ) : (
                          <button
                            className="cancel-booking-button"
                            type="button"
                            onClick={() => {
                              setCancelError('')
                              setConfirmCancelId(booking.id)
                            }}
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}
    </main>
  )
}

function ShowtimesSection({ movieId, authSession, onAuthenticated, onAuthenticationExpired }) {
  const [showtimes, setShowtimes] = useState([])
  const [selectedShowtime, setSelectedShowtime] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getShowtimesByMovieId(movieId, { signal: controller.signal })
      .then((loadedShowtimes) => {
        setShowtimes(loadedShowtimes)
        setStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setErrorMessage(error.message || 'Unable to load showtimes.')
        setStatus('error')
      })

    return () => controller.abort()
  }, [movieId, loadAttempt])

  function retryLoading() {
    setErrorMessage('')
    setStatus('loading')
    setLoadAttempt((attempt) => attempt + 1)
  }

  return (
    <section className="showtimes-section" aria-labelledby="showtimes-heading">
      {selectedShowtime ? (
        <SeatSelection
          showtime={selectedShowtime}
          authSession={authSession}
          onAuthenticated={onAuthenticated}
          onAuthenticationExpired={onAuthenticationExpired}
          onBack={() => setSelectedShowtime(null)}
        />
      ) : (
      <>
      <div className="showtimes-heading">
        <div>
          <span className="section-kicker">FIND A SCREENING</span>
          <h2 id="showtimes-heading">Showtimes</h2>
        </div>
        {status === 'success' && showtimes.length > 0 && (
          <span className="movie-count">{showtimes.length.toString().padStart(2, '0')} SHOWS</span>
        )}
      </div>

      {status === 'loading' ? (
        <div className="empty-state showtimes-state" role="status">
          <h3>Finding showtimes...</h3>
          <p>Checking available screenings for this movie.</p>
        </div>
      ) : status === 'error' ? (
        <div className="empty-state showtimes-state" role="alert">
          <h3>We couldn’t load showtimes</h3>
          <p>{errorMessage}</p>
          <button className="secondary-button" onClick={retryLoading}>Try again</button>
        </div>
      ) : showtimes.length === 0 ? (
        <div className="empty-state showtimes-state">
          <h3>No showtimes available</h3>
          <p>There are no screenings listed for this movie right now.</p>
        </div>
      ) : (
        <div className="showtime-list">
          {showtimes.map((showtime) => {
            const dateTime = formatShowtimeDateTime(showtime.startsAt)
            const ticketPrice = formatTicketPrice(showtime.priceInPaise)

            return (
              <article className="showtime-card" key={showtime.id}>
                <div className="showtime-venue">
                  {showtime.cinemaName && <h3>{showtime.cinemaName}</h3>}
                  {(showtime.city || showtime.screenName) && (
                    <p>{[showtime.city, showtime.screenName].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
                {dateTime && <time className="showtime-date" dateTime={showtime.startsAt}>{dateTime}</time>}
                {ticketPrice && <span className="showtime-price">{ticketPrice}</span>}
                <button
                  className="showtime-select-button"
                  type="button"
                  onClick={() => setSelectedShowtime(showtime)}
                >
                  Select Seats <span>→</span>
                </button>
              </article>
            )
          })}
        </div>
      )}
      </>
      )}
    </section>
  )
}

function MoviePoster({ movie, index = 0, isSaved, onToggleSaved, showNumber = true }) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <div className="movie-poster">
      {movie.posterUrl && !imageFailed && (
        <img
          className="movie-poster-image"
          src={movie.posterUrl}
          alt={`${movie.title} poster`}
          onError={() => setImageFailed(true)}
        />
      )}
      <div className="poster-texture" />
      {showNumber && <span className="poster-number">{String(index + 1).padStart(2, '0')}</span>}
      {onToggleSaved && (
        <button
          className={isSaved ? 'save-button saved' : 'save-button'}
          onClick={onToggleSaved}
          aria-label={isSaved ? 'Remove saved movie' : 'Save movie'}
          title="Save movie"
        >
          {isSaved ? '♥' : '♡'}
        </button>
      )}
      <div className="movie-poster-title">{movie.title}</div>
    </div>
  )
}

function MovieDetails({
  movieId,
  isSaved,
  onToggleSaved,
  onBack,
  authSession,
  onAuthenticated,
  onAuthenticationExpired,
}) {
  const [movie, setMovie] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getMovieById(movieId, { signal: controller.signal })
      .then((loadedMovie) => {
        setMovie(loadedMovie)
        setStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return

        if (error.status === 404) {
          setStatus('not-found')
        } else {
          setErrorMessage(error.message || 'Unable to load this movie.')
          setStatus('error')
        }
      })

    return () => controller.abort()
  }, [movieId, loadAttempt])

  function retryLoading() {
    setMovie(null)
    setErrorMessage('')
    setStatus('loading')
    setLoadAttempt((attempt) => attempt + 1)
  }

  return (
    <main className="movie-detail-page" id="movie-details">
      <button className="secondary-button back-button" onClick={onBack}>← Back to Movies</button>
      {status === 'loading' ? (
        <div className="empty-state" role="status"><h2>Loading movie...</h2><p>Getting the details for this film.</p></div>
      ) : status === 'not-found' ? (
        <div className="empty-state" role="alert"><h2>Movie not found</h2><p>This movie may have been removed or the link may be incorrect.</p></div>
      ) : status === 'error' ? (
        <div className="empty-state" role="alert">
          <h2>We couldn’t load this movie</h2>
          <p>{errorMessage}</p>
          <button className="secondary-button" onClick={retryLoading}>Try again</button>
        </div>
      ) : (
        <>
          <div className="movie-detail-layout">
            <div className="movie-detail-art">
              <MoviePoster
                movie={movie}
                isSaved={isSaved}
                onToggleSaved={onToggleSaved}
                showNumber={false}
              />
            </div>
            <section className="movie-detail-content">
              <span className="section-kicker">MOVIE DETAILS</span>
              <h1>{movie.title}</h1>
              <dl className="movie-detail-metadata">
                {formatReleaseDate(movie.releaseDate) && (
                  <div><dt>Release date</dt><dd>{formatReleaseDate(movie.releaseDate)}</dd></div>
                )}
                {formatDuration(movie.durationMinutes) && (
                  <div><dt>Duration</dt><dd>{formatDuration(movie.durationMinutes)}</dd></div>
                )}
                {movie.language && (
                  <div><dt>Language</dt><dd>{movie.language}</dd></div>
                )}
              </dl>
              {movie.description && <p className="movie-detail-description">{movie.description}</p>}
            </section>
          </div>
          <ShowtimesSection
            movieId={movie.id}
            authSession={authSession}
            onAuthenticated={onAuthenticated}
            onAuthenticationExpired={onAuthenticationExpired}
          />
        </>
      )}
    </main>
  )
}

const CATALOGUE_PAGE_LIMIT = 12
const KNOWN_LANGUAGES = [
  'English',
  'Hindi',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Kannada',
  'Bengali',
  'Marathi',
  'Spanish',
  'French',
  'Japanese',
  'Korean',
]

function App() {
  const [movies, setMovies] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: CATALOGUE_PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  })
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('')
  const [page, setPage] = useState(1)
  const [savedMovies, setSavedMovies] = useState([])
  const [notice, setNotice] = useState('')
  const [loadStatus, setLoadStatus] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [selectedMovieId, setSelectedMovieId] = useState(getMovieIdFromHash)
  const [isBookingsPage, setIsBookingsPage] = useState(() => window.location.hash === '#bookings')
  const [isAdminPage, setIsAdminPage] = useState(() => window.location.hash === '#admin')
  const [authMode, setAuthMode] = useState(getAuthModeFromHash)
  const [authSession, setAuthSession] = useState(null)
  const authReturnHash = useRef(
    window.location.hash !== '#signin' && window.location.hash !== '#register'
      ? window.location.hash || '#movies'
      : '#movies',
  )
  const previousRouteHash = useRef(
    window.location.hash && window.location.hash !== '#bookings'
      ? window.location.hash
      : '#movies',
  )

  useEffect(() => {
    const syncRoute = () => {
      setSelectedMovieId(getMovieIdFromHash())
      setIsBookingsPage(window.location.hash === '#bookings')
      setIsAdminPage(window.location.hash === '#admin')
      setAuthMode(getAuthModeFromHash())
    }
    window.addEventListener('hashchange', syncRoute)
    window.addEventListener('popstate', syncRoute)

    return () => {
      window.removeEventListener('hashchange', syncRoute)
      window.removeEventListener('popstate', syncRoute)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()

    getMovies({
      page,
      limit: CATALOGUE_PAGE_LIMIT,
      search: debouncedSearch,
      language: selectedLanguage,
      signal: controller.signal,
    })
      .then((data) => {
        setMovies(data.movies)
        setPagination(data.pagination)
        setLoadStatus('success')
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setLoadError(error.message || 'Unable to load movies.')
        setLoadStatus('error')
      })

    return () => controller.abort()
  }, [debouncedSearch, selectedLanguage, page, loadAttempt])

  const languageOptions = useMemo(() => {
    const set = new Set(KNOWN_LANGUAGES)
    movies.forEach((movie) => {
      if (movie.language && movie.language.trim()) {
        set.add(movie.language.trim())
      }
    })
    return Array.from(set).sort()
  }, [movies])

  function handleSearchChange(event) {
    setSearchInput(event.target.value)
    setPage(1)
    setLoadStatus('loading')
  }

  function handleLanguageChange(event) {
    setSelectedLanguage(event.target.value)
    setPage(1)
    setLoadStatus('loading')
  }

  function toggleSaved(id) {
    setSavedMovies((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const clearAuthentication = useCallback(() => {
    setAuthSession(null)
  }, [])

  function retryLoading() {
    setLoadError('')
    setLoadStatus('loading')
    setLoadAttempt((attempt) => attempt + 1)
  }

  function clearSearch() {
    setSearchInput('')
    setDebouncedSearch('')
    setSelectedLanguage('')
    setPage(1)
    setLoadStatus('loading')
  }

  function openMovie(movieId) {
    window.history.pushState(
      { movieId },
      '',
      `#movie/${encodeURIComponent(movieId)}`,
    )
    setSelectedMovieId(movieId)
    setIsBookingsPage(false)
    setIsAdminPage(false)
    window.scrollTo(0, 0)
  }

  function backToMovies() {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#movies`)
    setSelectedMovieId(null)
    setIsBookingsPage(false)
    setIsAdminPage(false)
    requestAnimationFrame(() => document.getElementById('movies')?.scrollIntoView())
  }

  function openBookings() {
    setAuthMode(null)
    setIsAdminPage(false)
    if (window.location.hash !== '#bookings') {
      previousRouteHash.current = window.location.hash || '#movies'
      window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#bookings`)
    }
    setIsBookingsPage(true)
    window.scrollTo(0, 0)
  }

  function backFromBookings() {
    const previousHash = previousRouteHash.current || '#movies'
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${previousHash}`)
    setIsBookingsPage(false)
    setIsAdminPage(false)
    setSelectedMovieId(getMovieIdFromHash())
    window.scrollTo(0, 0)
  }

  function openAuth(mode) {
    if (window.location.hash !== '#signin' && window.location.hash !== '#register') {
      authReturnHash.current = window.location.hash || '#movies'
    }
    const authHash = mode === 'register' ? '#register' : '#signin'
    window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${authHash}`)
    setAuthMode(mode)
    setIsBookingsPage(false)
    window.scrollTo(0, 0)
  }

  function backFromAuth() {
    const returnHash = authReturnHash.current || '#movies'
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${returnHash}`)
    setAuthMode(null)
    setIsBookingsPage(returnHash === '#bookings')
    setIsAdminPage(returnHash === '#admin')
    setSelectedMovieId(getMovieIdFromHash())
    window.scrollTo(0, 0)
  }

  function completeAuthentication(session) {
    setAuthSession(session)
    const returnHash = authReturnHash.current || '#movies'
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${returnHash}`)
    setAuthMode(null)
    setIsBookingsPage(returnHash === '#bookings')
    setIsAdminPage(returnHash === '#admin')
    setSelectedMovieId(getMovieIdFromHash())
    window.scrollTo(0, 0)
  }

  function logout() {
    setAuthSession(null)
    authReturnHash.current = '#movies'
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#movies`)
    setAuthMode(null)
    setIsBookingsPage(false)
    setIsAdminPage(false)
    setSelectedMovieId(null)
    window.scrollTo(0, 0)
  }

  return (
    <div className="cinevo">
      <header className="navbar">
        <a className="brand" href="#home" aria-label="Cinevo home">
          <span className="brand-mark">C</span>
          <span>cinevo<span className="brand-dot">.</span></span>
        </a>

        <nav className="nav-links">
          <a className="nav-active" href="#home">Home</a>
          <a href="#movies">Explore movies</a>
          <a href="#bookings" onClick={(event) => { event.preventDefault(); openBookings() }}>My Bookings</a>
          {authSession?.user?.role === 'admin' && (
            <a href="#admin" onClick={(event) => {
              event.preventDefault()
              window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#admin`)
              setIsAdminPage(true)
              setIsBookingsPage(false)
              setSelectedMovieId(null)
              window.scrollTo(0, 0)
            }}>Admin Dashboard</a>
          )}
          <a href="#about">About</a>
        </nav>

        {authSession ? (
          <button className="signin-button" type="button" onClick={logout}>Sign out</button>
        ) : (
          <button className="signin-button" type="button" onClick={() => openAuth('login')}>Sign in</button>
        )}
      </header>

      {authMode ? (
        <AuthPage
          mode={authMode}
          onAuthenticated={completeAuthentication}
          onModeChange={openAuth}
          onBack={backFromAuth}
        />
      ) : isBookingsPage ? (
        <MyBookings
          authSession={authSession}
          onAuthenticated={setAuthSession}
          onAuthenticationExpired={clearAuthentication}
          onBack={backFromBookings}
        />
      ) : isAdminPage ? (
        <AdminDashboard
          authSession={authSession}
          onBack={backToMovies}
          onSignIn={() => openAuth('login')}
        />
      ) : selectedMovieId ? (
        <MovieDetails
          key={selectedMovieId}
          movieId={selectedMovieId}
          isSaved={savedMovies.includes(selectedMovieId)}
          onToggleSaved={() => toggleSaved(selectedMovieId)}
          onBack={backToMovies}
          authSession={authSession}
          onAuthenticated={setAuthSession}
          onAuthenticationExpired={clearAuthentication}
        />
      ) : (
      <main id="home">
        <section className="hero">
          <div className="hero-glow" />
          <div className="hero-copy">
            <div className="eyebrow"><span className="live-dot" /> YOUR NEXT MOVIE NIGHT STARTS HERE</div>
            <h1>Stories that<br />stay with <span>you.</span></h1>
            <p className="hero-description">
              Discover unforgettable films, find your perfect showtime,
              and make every movie night count.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="#movies">Explore movies <span>↗</span></a>
              <a className="secondary-button" href="#movies">Browse collection <span>↓</span></a>
            </div>
            <div className="hero-meta">
              <div><strong>01</strong><span>DISCOVER</span></div>
              <div><strong>02</strong><span>CHOOSE A SHOW</span></div>
              <div><strong>03</strong><span>ENJOY THE FILM</span></div>
            </div>
          </div>

          <div className="hero-art" aria-label="Featured movie artwork">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="featured-poster">
              <div className="poster-stars">✦ &nbsp; · &nbsp; ✧ &nbsp; · &nbsp; ✦</div>
              <div className="poster-sun" />
              <div className="poster-horizon" />
              <div className="poster-person" />
              <div className="poster-title">BEYOND<br /><span>THE</span> UNKNOWN</div>
              <div className="poster-caption">A CINEMATIC EXPERIENCE</div>
            </div>
            <div className="floating-note"><span className="note-icon">✦</span><div><strong>Find your next favourite</strong><small>One great story away</small></div></div>
            <div className="art-index">CINEVO ORIGINAL / 001</div>
          </div>
        </section>

        <section className="movies-section" id="movies">
          <div className="section-heading">
            <div><span className="section-kicker">HANDPICKED FOR YOUR NEXT NIGHT OUT</span><h2>Find your <span>next favourite.</span></h2></div>
            <span className="movie-count">{(pagination.total ?? movies.length).toString().padStart(2, '0')} FILMS</span>
          </div>

          <div className="movie-toolbar">
            <label className="search-box">
              <span>⌕</span>
              <input
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Search movies..."
                aria-label="Search movies"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    setDebouncedSearch('')
                    setPage(1)
                  }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </label>

            <label className="language-filter">
              <span className="language-filter-label">Language</span>
              <select
                value={selectedLanguage}
                onChange={handleLanguageChange}
                aria-label="Filter by language"
              >
                <option value="">All languages</option>
                {languageOptions.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loadStatus === 'loading' ? (
            <div className="empty-state" role="status"><h3>Loading films...</h3><p>Finding your next movie night.</p></div>
          ) : loadStatus === 'error' ? (
            <div className="empty-state" role="alert">
              <h3>We couldn’t load the films</h3>
              <p>{loadError}</p>
              <button className="secondary-button" type="button" onClick={retryLoading}>Try again</button>
            </div>
          ) : movies.length === 0 ? (
            debouncedSearch || selectedLanguage ? (
              <div className="empty-state" role="status">
                <span>⌕</span>
                <h3>No films found</h3>
                <p>Try adjusting your search or language filter.</p>
                <button className="secondary-button" type="button" onClick={clearSearch}>Clear search</button>
              </div>
            ) : (
              <div className="empty-state" role="status">
                <h3>No movies available</h3>
                <p>There are no films to show right now. Please check back soon.</p>
              </div>
            )
          ) : (
            <>
              <div className={movies.length === 1 ? 'movie-grid single-result' : 'movie-grid'}>
                {movies.map((movie, index) => {
                  const posterNumber = (page - 1) * CATALOGUE_PAGE_LIMIT + index
                  return (
                    <article className="movie-card" key={movie.id}>
                      <MoviePoster
                        movie={movie}
                        index={posterNumber}
                        isSaved={savedMovies.includes(movie.id)}
                        onToggleSaved={() => toggleSaved(movie.id)}
                      />
                      <div className="movie-info">
                        <div className="movie-title-row"><h3>{movie.title}</h3></div>
                        <p>
                          {[getReleaseYear(movie.releaseDate), formatDuration(movie.durationMinutes), movie.language]
                            .filter(Boolean)
                            .map((detail, detailIndex) => (
                              <span key={`${movie.id}-${detailIndex}`}>
                                {detailIndex > 0 && <span className="metadata-separator"> · </span>}
                                {detail}
                              </span>
                            ))}
                        </p>
                        {movie.description && <p className="movie-description">{movie.description}</p>}
                        <button className="book-button" type="button" onClick={() => openMovie(movie.id)}>View movie <span>↗</span></button>
                      </div>
                    </article>
                  )
                })}
              </div>

              <nav className="catalogue-pagination" aria-label="Movie catalogue pagination">
                <button
                  className="pagination-button"
                  type="button"
                  disabled={page <= 1 || loadStatus === 'loading'}
                  onClick={() => {
                    setLoadStatus('loading')
                    setPage((p) => Math.max(1, p - 1))
                    document.getElementById('movies')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  aria-label="Previous page"
                >
                  ← Previous
                </button>
                <span className="pagination-status" aria-live="polite">
                  Page <strong>{page}</strong> of <strong>{pagination.totalPages || 1}</strong>
                </span>
                <button
                  className="pagination-button"
                  type="button"
                  disabled={page >= pagination.totalPages || loadStatus === 'loading' || pagination.totalPages <= 1}
                  onClick={() => {
                    setLoadStatus('loading')
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                    document.getElementById('movies')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  aria-label="Next page"
                >
                  Next →
                </button>
              </nav>
            </>
          )}
          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notice">×</button></div>}
        </section>

        <section className="closing-banner" id="about">
          <div><span className="section-kicker">YOUR SEAT IS WAITING</span><h2>Great films. <span>Better nights.</span></h2></div>
          <a className="primary-button" href="#movies">Find a film <span>↗</span></a>
        </section>
      </main>
      )}

      <footer className="footer">
        <a className="brand" href="#home"><span className="brand-mark">C</span><span>cinevo<span className="brand-dot">.</span></span></a>
        <p>Made for the love of cinema.</p>
        <span>© 2026 CINEVO</span>
      </footer>
    </div>
  )
}

export default App
