import { MovieCard } from "./MovieCard.jsx";

export function MovieGrid({
  movies,
  page = 1,
  limit = 12,
  savedMovieIds = [],
  onToggleSaved,
  onSelectMovie,
}) {
  const isSingle = movies.length === 1;

  return (
    <div className={isSingle ? "movie-grid single-result" : "movie-grid"}>
      {movies.map((movie, index) => {
        const posterNumber = (page - 1) * limit + index;
        return (
          <MovieCard
            key={movie.id}
            movie={movie}
            index={posterNumber}
            isSaved={savedMovieIds.includes(movie.id)}
            onToggleSaved={onToggleSaved}
            onSelect={onSelectMovie}
          />
        );
      })}
    </div>
  );
}
