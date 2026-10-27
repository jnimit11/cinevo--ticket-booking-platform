import { formatDuration } from "../../core/utils/duration.js";
import { formatReleaseDate } from "../../core/utils/date.js";

export function MovieDetailsHeader({ movie, onBack }) {
  if (!movie) return null;

  return (
    <div className="movie-details-hero">
      <div className="movie-details-backdrop">
        {movie.posterUrl && (
          <img src={movie.posterUrl} alt="" className="details-backdrop-img" aria-hidden="true" />
        )}
        <div className="details-vignette" />
      </div>

      <div className="movie-details-content">
        <button className="secondary-button back-button" type="button" onClick={onBack}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">
            arrow_back
          </span>
          <span>Back to Movies</span>
        </button>

        <div className="movie-details-layout">
          <div className="movie-details-poster-wrap">
            {movie.posterUrl ? (
              <img src={movie.posterUrl} alt={movie.title} className="details-poster-img" />
            ) : (
              <div className="movie-poster-fallback">
                <span className="material-symbols-outlined fallback-icon" aria-hidden="true">
                  movie
                </span>
                <span className="fallback-title">{movie.title}</span>
              </div>
            )}
          </div>

          <div className="movie-details-meta">
            <span className="section-kicker">PREMIER SCREENING</span>
            <h1 className="details-title">{movie.title}</h1>
            <div className="details-tags">
              <span className="tag-badge">{movie.language}</span>
              <span className="tag-badge">{formatDuration(movie.durationMinutes)}</span>
              {movie.releaseDate && (
                <span className="tag-badge">{formatReleaseDate(movie.releaseDate)}</span>
              )}
            </div>
            <p className="details-synopsis">{movie.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
