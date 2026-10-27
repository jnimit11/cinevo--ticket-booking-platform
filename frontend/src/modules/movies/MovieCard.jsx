import { formatDuration } from "../../core/utils/duration.js";
import { getReleaseYear } from "../../core/utils/date.js";

export function MovieCard({
  movie,
  index = 0,
  isSaved = false,
  onToggleSaved,
  onSelect,
  showNumber = true,
}) {
  const durationText = formatDuration(movie.durationMinutes);
  const releaseYear = getReleaseYear(movie.releaseDate);

  return (
    <article
      className="movie-card movie-card-luxury group cursor-pointer"
      onClick={() => onSelect?.(movie.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(movie.id);
        }
      }}
    >
      <div className="movie-poster-wrap">
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="movie-poster"
            loading="lazy"
          />
        ) : (
          <div className="movie-poster-fallback">
            <span className="material-symbols-outlined fallback-icon" aria-hidden="true">
              movie
            </span>
            <span className="fallback-title">{movie.title}</span>
          </div>
        )}

        <div className="poster-overlay" />

        {showNumber && (
          <span className="ranking-number" aria-hidden="true">
            {index + 1}
          </span>
        )}

        {onToggleSaved && (
          <button
            className={`bookmark-button ${isSaved ? "saved" : ""}`}
            type="button"
            aria-label={isSaved ? `Remove ${movie.title} from saved` : `Save ${movie.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSaved(movie.id);
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {isSaved ? "bookmark_added" : "bookmark_add"}
            </span>
          </button>
        )}
      </div>

      <div className="movie-info">
        <div className="movie-tags">
          <span className="language-badge">{movie.language}</span>
          {releaseYear && <span className="meta-dot-text">{releaseYear}</span>}
          {durationText && <span className="meta-dot-text">{durationText}</span>}
        </div>
        <h3 className="movie-card-title">{movie.title}</h3>
      </div>
    </article>
  );
}
