import { useState } from "react";
import { formatDuration } from "../../core/utils/duration.js";
import { getReleaseYear } from "../../core/utils/date.js";

function MoviePoster({ movie, index = 0, isSaved, onToggleSaved, showNumber = true }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="movie-poster">
      {movie.posterUrl && !imageFailed ? (
        <img
          className="movie-poster-image"
          src={movie.posterUrl}
          alt={`${movie.title} poster`}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-surface-container via-surface-container-high to-surface-container-lowest">
          <span className="material-symbols-outlined text-4xl text-primary mb-2 opacity-60">movie</span>
          <span className="font-headline-sm text-sm text-on-surface font-semibold line-clamp-2">{movie.title}</span>
        </div>
      )}
      <div className="poster-texture" />
      {showNumber && <span className="poster-number">{String(index + 1).padStart(2, "0")}</span>}
      <span className="poster-format-badge">
        {movie.language === "English" ? "IMAX Laser" : movie.language ? `${movie.language} Dub` : "Standard"}
      </span>
      <span className="poster-rating-badge">
        <span className="material-symbols-outlined">star</span>
        <span>{((8.0 + ((index * 3) % 15) / 10).toFixed(1))}</span>
      </span>
      {onToggleSaved && (
        <button
          className={isSaved ? "save-button saved" : "save-button"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSaved(movie.id);
          }}
          aria-label={isSaved ? "Remove saved movie" : "Save movie"}
          title="Save movie"
          type="button"
        >
          {isSaved ? "♥" : "♡"}
        </button>
      )}
      <div className="movie-poster-title">{movie.title}</div>
    </div>
  );
}

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
      className="movie-card group"
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
      <MoviePoster
        movie={movie}
        index={index}
        isSaved={isSaved}
        onToggleSaved={onToggleSaved}
        showNumber={showNumber}
      />
      <div className="movie-info">
        <div className="movie-title-row">
          <h3 title={movie.title}>{movie.title}</h3>
        </div>
        <p className="movie-metadata-line">
          {[releaseYear, durationText, movie.language]
            .filter(Boolean)
            .map((detail, detailIndex) => (
              <span key={`${movie.id}-${detailIndex}`}>
                {detailIndex > 0 && <span className="metadata-separator">·</span>}
                {detail}
              </span>
            ))}
        </p>
        {movie.description && <p className="movie-description">{movie.description}</p>}
        <button
          className="book-button"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(movie.id);
          }}
        >
          <span className="material-symbols-outlined">confirmation_number</span>
          <span>Book Tickets</span>
        </button>
      </div>
    </article>
  );
}
