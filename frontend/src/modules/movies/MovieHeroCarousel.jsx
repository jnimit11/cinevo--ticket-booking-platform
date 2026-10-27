import { useState, useEffect } from "react";
import { formatDuration } from "../../core/utils/duration.js";
import { getReleaseYear } from "../../core/utils/date.js";

export function MovieHeroCarousel({ movies, onSelectMovie }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const featuredMovies = movies.slice(0, 5);

  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [featuredMovies.length]);

  if (!featuredMovies.length) return null;

  const currentMovie = featuredMovies[currentIndex] || featuredMovies[0];

  return (
    <section className="hero-section" aria-label="Featured Premiere Screenings">
      <div className="hero-backdrop-container">
        {currentMovie.posterUrl && (
          <img
            src={currentMovie.posterUrl}
            alt=""
            className="hero-backdrop-img"
            aria-hidden="true"
          />
        )}
        <div className="hero-vignette" />
      </div>

      <div className="hero-content">
        <span className="hero-badge">PREMIER EXCLUSIVE</span>
        <h1 className="hero-title">{currentMovie.title}</h1>
        <div className="hero-meta">
          <span className="hero-pill">{currentMovie.language}</span>
          <span className="hero-pill">
            {formatDuration(currentMovie.durationMinutes)}
          </span>
          <span className="hero-pill">
            {getReleaseYear(currentMovie.releaseDate)}
          </span>
          <span className="hero-pill-format">DOLBY ATMOS &bull; LASER 4K</span>
        </div>
        <p className="hero-synopsis">{currentMovie.description}</p>
        <div className="hero-actions">
          <button
            className="primary-button hero-cta"
            type="button"
            onClick={() => onSelectMovie(currentMovie.id)}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              confirmation_number
            </span>
            <span>Reserve Screenings</span>
          </button>
        </div>
      </div>

      {featuredMovies.length > 1 && (
        <div className="hero-indicators" role="tablist">
          {featuredMovies.map((m, idx) => (
            <button
              key={m.id}
              className={`indicator-dot ${idx === currentIndex ? "active" : ""}`}
              type="button"
              role="tab"
              aria-selected={idx === currentIndex}
              aria-label={`Show ${m.title}`}
              onClick={() => setCurrentIndex(idx)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
