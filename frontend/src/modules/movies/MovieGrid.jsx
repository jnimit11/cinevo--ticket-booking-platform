import { MovieCard } from "./MovieCard.jsx";

export function MovieGrid({
  movies,
  savedMovieIds = [],
  onToggleSaved,
  onSelectMovie,
}) {
  return (
    <div className="movie-grid">
      {movies.map((movie, index) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          index={index}
          isSaved={savedMovieIds.includes(movie.id)}
          onToggleSaved={onToggleSaved}
          onSelect={onSelectMovie}
        />
      ))}
    </div>
  );
}
