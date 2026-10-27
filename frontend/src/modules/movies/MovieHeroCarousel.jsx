import { useState, useEffect } from "react";
import { formatDuration } from "../../core/utils/duration.js";
import { formatReleaseDate } from "../../core/utils/date.js";

export function MovieHeroCarousel({ movies = [], onSelectMovie }) {
  const [heroIndex, setHeroIndex] = useState(0);

  const featuredMovies = movies.slice(0, 5);

  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [featuredMovies.length]);

  if (!featuredMovies.length) return null;

  const spotlightMovie = featuredMovies[heroIndex % featuredMovies.length] || featuredMovies[0];

  return (
    <section className="hero-spotlight" id="spotlight">
      {spotlightMovie ? (
        <>
          <div className="hero-backdrop-container">
            <img
              className="hero-backdrop-image"
              src={spotlightMovie.backdropUrl || spotlightMovie.posterUrl}
              alt={spotlightMovie.title}
            />
            <div className="hero-scrim-bottom" />
            <div className="hero-scrim-left" />
          </div>

          <div className="hero-content-stage">
            <div className="hero-spotlight-details">
              <div className="hero-kicker-badge">
                <span className="hero-kicker-dot" />
                <span className="hero-kicker-text">Now Showing · Premier Spotlight</span>
              </div>

              <h1 className="hero-title">{spotlightMovie.title}</h1>

              <div className="hero-metadata-row">
                {formatDuration(spotlightMovie.durationMinutes) && (
                  <span>{formatDuration(spotlightMovie.durationMinutes)}</span>
                )}
                {spotlightMovie.language && (
                  <>
                    <span className="hero-meta-dot" />
                    <span>{spotlightMovie.language}</span>
                  </>
                )}
                {formatReleaseDate(spotlightMovie.releaseDate) && (
                  <>
                    <span className="hero-meta-dot" />
                    <span>{formatReleaseDate(spotlightMovie.releaseDate)}</span>
                  </>
                )}
              </div>

              {spotlightMovie.description && (
                <p className="hero-synopsis">{spotlightMovie.description}</p>
              )}

              <div className="hero-cta-cluster">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => onSelectMovie(spotlightMovie.id)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    confirmation_number
                  </span>
                  <span>Book Tickets</span>
                </button>
                <a className="secondary-button" href="#movies">
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    explore
                  </span>
                  <span>Explore Movies</span>
                </a>
              </div>
            </div>

            {featuredMovies.length > 1 && (
              <div className="hero-nav-strip">
                <div className="hero-counter-group">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="hero-counter">
                      {String((heroIndex % featuredMovies.length) + 1).padStart(2, "0")}
                    </span>
                    <span className="hero-counter-total">
                      / {String(featuredMovies.length).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="hero-progress-bars">
                    {featuredMovies.map((_, dotIdx) => (
                      <div
                        key={dotIdx}
                        className={`hero-progress-bar ${
                          dotIdx === (heroIndex % featuredMovies.length) ? "active" : "inactive"
                        }`}
                        onClick={() => setHeroIndex(dotIdx)}
                        title={`Jump to movie ${dotIdx + 1}`}
                      />
                    ))}
                  </div>

                  {featuredMovies[(heroIndex + 1) % featuredMovies.length] && (
                    <span className="hero-next-preview">
                      Next: {featuredMovies[(heroIndex + 1) % featuredMovies.length].title}
                    </span>
                  )}
                </div>

                <div className="hero-controls">
                  <button
                    className="hero-control-btn"
                    type="button"
                    aria-label="Previous Spotlight"
                    onClick={() =>
                      setHeroIndex(
                        (curr) => (curr - 1 + featuredMovies.length) % featuredMovies.length,
                      )
                    }
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      arrow_back
                    </span>
                  </button>
                  <button
                    className="hero-control-btn"
                    type="button"
                    aria-label="Next Spotlight"
                    onClick={() =>
                      setHeroIndex((curr) => (curr + 1) % featuredMovies.length)
                    }
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="hero-content-stage" style={{ padding: "96px 24px" }}>
          <div className="hero-spotlight-details">
            <span className="hero-kicker-badge">
              <span className="hero-kicker-dot" />
              <span className="hero-kicker-text">Private Screenings</span>
            </span>
            <h1 className="hero-title">Experience Cinema in Its Purest Form</h1>
            <p className="hero-synopsis">
              Curated premier presentations, uncompressed Dolby Atmos sound, and luxurious reclining auditoria.
            </p>
            <div className="hero-cta-cluster">
              <a className="primary-button" href="#movies">
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  explore
                </span>
                <span>Explore Collection</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
