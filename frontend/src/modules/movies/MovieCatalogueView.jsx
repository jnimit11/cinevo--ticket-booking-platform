import { useMovies } from "./useMovies.js";
import { MovieHeroCarousel } from "./MovieHeroCarousel.jsx";
import { MovieFilterBar } from "./MovieFilterBar.jsx";
import { MovieGrid } from "./MovieGrid.jsx";
import { Spinner } from "../../shared/components/Spinner/Spinner.jsx";
import { EmptyState } from "../../shared/components/EmptyState/EmptyState.jsx";
import { useLocalStorage } from "../../shared/hooks/useLocalStorage.js";

export function MovieCatalogueView({ onSelectMovie }) {
  const {
    movies,
    pagination,
    searchInput,
    selectedLanguage,
    languageOptions,
    loadStatus,
    loadError,
    page,
    setPage,
    handleSearchChange,
    handleLanguageChange,
    clearSearch,
    retryLoading,
  } = useMovies();

  const [savedMovieIds, setSavedMovieIds] = useLocalStorage("cinevo_saved_movies", []);

  const toggleSaved = (movieId) => {
    setSavedMovieIds((prev) =>
      prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [...prev, movieId],
    );
  };

  return (
    <div className="catalogue-view">
      {/* Featured Premieres Carousel */}
      {movies.length > 0 && (
        <MovieHeroCarousel movies={movies} onSelectMovie={onSelectMovie} />
      )}

      {/* Main Movie Listing */}
      <section className="catalogue-section" id="movies">
        <div className="catalogue-header">
          <div>
            <span className="section-kicker">CURATED SCREENINGS</span>
            <h2 className="section-title">Now Showing</h2>
          </div>
          <MovieFilterBar
            searchInput={searchInput}
            onSearchChange={handleSearchChange}
            selectedLanguage={selectedLanguage}
            onLanguageChange={handleLanguageChange}
            languageOptions={languageOptions}
            onClear={clearSearch}
          />
        </div>

        {loadStatus === "loading" && (
          <div className="status-panel">
            <Spinner message="Curating cinema catalogue..." />
          </div>
        )}

        {loadStatus === "error" && (
          <div className="status-panel error-panel" role="alert">
            <span className="material-symbols-outlined" aria-hidden="true">
              error
            </span>
            <p>{loadError}</p>
            <button className="primary-button" type="button" onClick={retryLoading}>
              Retry Connection
            </button>
          </div>
        )}

        {loadStatus === "success" && movies.length === 0 && (
          <EmptyState
            icon="movie_off"
            title="No movies found"
            description="No screenings matched your search filters. Try adjusting your parameters."
            actionLabel="Reset Filters"
            onAction={clearSearch}
          />
        )}

        {loadStatus === "success" && movies.length > 0 && (
          <>
            <MovieGrid
              movies={movies}
              savedMovieIds={savedMovieIds}
              onToggleSaved={toggleSaved}
              onSelectMovie={onSelectMovie}
            />

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="pagination-bar" role="navigation" aria-label="Pagination">
                <button
                  className="secondary-button pagination-btn"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    arrow_back
                  </span>
                  <span>Previous</span>
                </button>
                <span className="pagination-info">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  className="secondary-button pagination-btn"
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
