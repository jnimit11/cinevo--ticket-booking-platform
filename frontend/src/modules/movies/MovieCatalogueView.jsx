import { useState } from "react";
import { useMovies } from "./useMovies.js";
import { MovieHeroCarousel } from "./MovieHeroCarousel.jsx";
import { MovieGrid } from "./MovieGrid.jsx";
import { useLocalStorage } from "../../shared/hooks/useLocalStorage.js";

const FORMAT_OPTIONS = [
  "All Formats",
  "IMAX Laser",
  "Dolby Cinema",
  "70mm Film",
  "3D RealD",
  "Private Suites",
];

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

  const [selectedFormat, setSelectedFormat] = useState("All Formats");
  const [savedMovieIds, setSavedMovieIds] = useLocalStorage("cinevo_saved_movies", []);

  const toggleSaved = (movieId) => {
    setSavedMovieIds((prev) =>
      prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [...prev, movieId],
    );
  };

  return (
    <div className="catalogue-view">
      {/* Featured Premieres Panoramic Carousel */}
      {movies.length > 0 && (
        <MovieHeroCarousel movies={movies} onSelectMovie={onSelectMovie} />
      )}

      {/* Auditorium Formats & Tech Bar */}
      <section className="formats-tech-bar">
        <div className="formats-bar-container">
          <div className="format-pill-list">
            {FORMAT_OPTIONS.map((format) => (
              <button
                key={format}
                className={`format-pill ${selectedFormat === format ? "active" : ""}`}
                type="button"
                onClick={() => setSelectedFormat(format)}
              >
                {format}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            <div className="tech-spec-indicator">
              <span className="material-symbols-outlined">translate</span>
              <span>Audio: {selectedLanguage || "All Languages"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Now Showing: Curated 4-Column Catalogue Section */}
      <section className="movies-section" id="movies">
        <div className="section-heading">
          <div>
            <span className="section-kicker">CURATED REPERTOIRE</span>
            <h2>Now Showing</h2>
            <p className="section-subtitle">
              Exclusive presentations across private luxury screening rooms.
            </p>
          </div>
          <span className="movie-count">
            {(pagination.total ?? movies.length).toString().padStart(2, "0")} FILMS
          </span>
        </div>

        {/* Search & Language Toolbar */}
        <div className="movie-toolbar">
          <label className="search-box">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search films by title, genre, director..."
              aria-label="Search movies"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  close
                </span>
              </button>
            )}
          </label>

          <label className="language-filter">
            <span className="material-symbols-outlined" style={{ color: "#ffb3b6", fontSize: "16px" }}>
              translate
            </span>
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

        {/* Loading State */}
        {loadStatus === "loading" && (
          <div className="empty-state" role="status">
            <span
              className="material-symbols-outlined"
              style={{ animation: "spin 1s linear infinite", fontSize: "32px" }}
            >
              progress_activity
            </span>
            <h3>Curating Film Presentations...</h3>
            <p>Preparing showtimes and private auditorium reservations.</p>
          </div>
        )}

        {/* Error State */}
        {loadStatus === "error" && (
          <div className="empty-state" role="alert">
            <span className="material-symbols-outlined" style={{ fontSize: "36px" }}>
              error
            </span>
            <h3>Unable to Load Film Programme</h3>
            <p>{loadError}</p>
            <button className="secondary-button" type="button" onClick={retryLoading}>
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                refresh
              </span>
              <span>Try again</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {loadStatus === "success" && movies.length === 0 && (
          <div className="empty-state" role="status">
            <span className="material-symbols-outlined" style={{ fontSize: "36px" }}>
              {searchInput || selectedLanguage ? "search_off" : "theaters"}
            </span>
            <h3>
              {searchInput || selectedLanguage ? "No Films Found" : "No Screenings Scheduled"}
            </h3>
            <p>
              {searchInput || selectedLanguage
                ? `We could not find any films matching "${searchInput || selectedLanguage}".`
                : "Private screenings are currently being programmed. Please check back shortly."}
            </p>
            {(searchInput || selectedLanguage) && (
              <button className="secondary-button" type="button" onClick={clearSearch}>
                Clear filter
              </button>
            )}
          </div>
        )}

        {/* Movie Grid & Pagination */}
        {loadStatus === "success" && movies.length > 0 && (
          <>
            <div className={movies.length === 1 ? "movie-grid single-result" : "movie-grid"}>
              <MovieGrid
                movies={movies}
                savedMovieIds={savedMovieIds}
                onToggleSaved={toggleSaved}
                onSelectMovie={onSelectMovie}
              />
            </div>

            {pagination.totalPages > 1 && (
              <nav className="catalogue-pagination" aria-label="Movie catalogue pagination">
                <button
                  className="pagination-button"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    document.getElementById("movies")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  aria-label="Previous page"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                    arrow_back
                  </span>
                  <span>Previous</span>
                </button>
                <span className="pagination-status" aria-live="polite">
                  Page <strong>{page}</strong> of <strong>{pagination.totalPages || 1}</strong>
                </span>
                <button
                  className="pagination-button"
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => {
                    setPage((p) => Math.min(pagination.totalPages, p + 1));
                    document.getElementById("movies")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                    arrow_forward
                  </span>
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
