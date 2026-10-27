import { formatDuration } from "../../core/utils/duration.js";
import { formatReleaseDate } from "../../core/utils/date.js";

export function MovieDetailsHeader({ movie, isSaved = false, onToggleSaved, onBack }) {
  if (!movie) return null;

  return (
    <>
      {/* Breadcrumb Ribbon */}
      <section className="detail-breadcrumb-bar">
        <div className="detail-breadcrumb-container">
          <nav aria-label="Breadcrumb" className="breadcrumb-nav">
            <button type="button" onClick={onBack} className="breadcrumb-link">
              Home
            </button>
            <span className="breadcrumb-sep">/</span>
            <button type="button" onClick={onBack} className="breadcrumb-link">
              Movies
            </button>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{movie.title}</span>
          </nav>
          <div className="breadcrumb-status">
            <span className="beacon-dot" />
            <span className="beacon-text">Now Booking · Premium Screenings</span>
          </div>
        </div>
      </section>

      {/* Cinematic Hero Spotlight */}
      <section className="movie-detail-hero">
        <div
          className="detail-hero-backdrop"
          style={{ backgroundImage: `url("${movie.backdropUrl || movie.posterUrl}")` }}
        />
        <div className="detail-hero-gradient-overlay" />
        <div className="detail-hero-radial-overlay" />

        <div className="detail-hero-stage">
          <div className="detail-hero-grid">
            {/* Poster column */}
            <div className="detail-poster-col">
              <div className="detail-poster-wrapper">
                {movie.posterUrl ? (
                  <img
                    className="detail-poster-img"
                    src={movie.posterUrl}
                    alt={`${movie.title} poster`}
                  />
                ) : (
                  <div className="detail-poster-fallback">
                    <span className="material-symbols-outlined text-4xl text-primary mb-2 opacity-60">
                      movie
                    </span>
                    <span className="font-headline-sm text-sm text-on-surface font-semibold">
                      {movie.title}
                    </span>
                  </div>
                )}
                {movie.language && (
                  <div className="detail-poster-overlay">
                    <span className="poster-pill-format">{movie.language}</span>
                  </div>
                )}
                {onToggleSaved && (
                  <button
                    className={`detail-save-btn ${isSaved ? "saved" : ""}`}
                    onClick={() => onToggleSaved(movie.id)}
                    aria-label={isSaved ? "Remove saved movie" : "Save movie"}
                    title="Save movie"
                    type="button"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                      {isSaved ? "favorite" : "favorite_border"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Info column */}
            <div className="detail-info-col">
              <div className="detail-kicker-row">
                <span className="detail-kicker-badge">FEATURE PRESENTATION</span>
              </div>

              <h1 className="detail-movie-title">{movie.title}</h1>

              <div className="detail-metadata-ribbon">
                {formatDuration(movie.durationMinutes) && (
                  <span className="meta-item">
                    <span className="material-symbols-outlined meta-icon">schedule</span>
                    {formatDuration(movie.durationMinutes)}
                  </span>
                )}
                {formatReleaseDate(movie.releaseDate) && (
                  <>
                    <span className="meta-dot">·</span>
                    <span className="meta-item">{formatReleaseDate(movie.releaseDate)}</span>
                  </>
                )}
                {movie.language && (
                  <>
                    <span className="meta-dot">·</span>
                    <span className="meta-item">{movie.language}</span>
                  </>
                )}
              </div>

              {movie.description && (
                <div className="detail-synopsis-block">
                  <h2 className="synopsis-heading">Synopsis</h2>
                  <p className="synopsis-body">{movie.description}</p>
                </div>
              )}

              {movie.language && (
                <div className="detail-audio-chips">
                  <span className="audio-label">Language:</span>
                  <span className="audio-chip">{movie.language}</span>
                </div>
              )}

              <div className="detail-action-buttons">
                <button
                  className="primary-button select-showtime-cta"
                  type="button"
                  onClick={() => {
                    document.getElementById("showtimes")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    calendar_month
                  </span>
                  <span>Select Showtime</span>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    arrow_downward
                  </span>
                </button>
                <button className="secondary-button back-cta-btn" onClick={onBack} type="button">
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                    arrow_back
                  </span>
                  <span>Back to Movies</span>
                </button>
                {onToggleSaved && (
                  <button
                    className={`secondary-button watchlist-cta-btn ${isSaved ? "active" : ""}`}
                    onClick={() => onToggleSaved(movie.id)}
                    type="button"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: isSaved ? "#ffb3b6" : "inherit" }}
                    >
                      {isSaved ? "favorite" : "favorite_border"}
                    </span>
                    <span>{isSaved ? "Saved in Watchlist" : "Add to Watchlist"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Accreditations Bar */}
      <section className="detail-tech-accreditations">
        <div className="detail-tech-container">
          <div className="tech-item">
            <span className="tech-item-kicker">Projection Standard</span>
            <h3 className="tech-item-title">Dual 4K Laser &amp; 15/70 Celluloid</h3>
            <p className="tech-item-desc">High Dynamic Range with 1.43:1 / 2.39:1 native aspect fidelity</p>
          </div>
          <div className="tech-divider" />
          <div className="tech-item">
            <span className="tech-item-kicker">Acoustic Architecture</span>
            <h3 className="tech-item-title">Dolby Atmos &amp; Meyer Sound EXP</h3>
            <p className="tech-item-desc">128-Object Soundscape with 64 discrete studio-calibrated channels</p>
          </div>
          <div className="tech-divider" />
          <div className="tech-item">
            <span className="tech-item-kicker">Seating Configuration</span>
            <h3 className="tech-item-title">Bespoke Italian Leather Recliners</h3>
            <p className="tech-item-desc">Generous acoustic row pitch with personal concierge call button</p>
          </div>
        </div>
      </section>
    </>
  );
}
