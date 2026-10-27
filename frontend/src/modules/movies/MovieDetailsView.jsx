import { useState, useEffect } from "react";
import { getMovieById } from "./movieApi.js";
import { MovieDetailsHeader } from "./MovieDetailsHeader.jsx";
import { ShowtimesSection } from "../showtimes/ShowtimesSection.jsx";
import { SeatSelectionView } from "../booking/SeatSelectionView.jsx";
import { useLocalStorage } from "../../shared/hooks/useLocalStorage.js";

export function MovieDetailsView({ movieId, onBack, onGoToBookings }) {
  const [movie, setMovie] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [savedMovieIds, setSavedMovieIds] = useLocalStorage("cinevo_saved_movies", []);

  const toggleSaved = (id) => {
    setSavedMovieIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    getMovieById(movieId, { signal: controller.signal })
      .then((loadedMovie) => {
        if (!ignore) {
          setMovie(loadedMovie);
          setStatus("success");
        }
      })
      .catch((error) => {
        if (ignore) return;
        if (controller.signal.aborted) return;

        if (error.status === 404) {
          setStatus("not-found");
        } else {
          setErrorMessage(error.message || "Unable to load this movie.");
          setStatus("error");
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [movieId, loadAttempt]);

  function retryLoading() {
    setMovie(null);
    setErrorMessage("");
    setStatus("loading");
    setLoadAttempt((attempt) => attempt + 1);
  }

  // If a showtime is currently selected, display the interactive seat selection view
  if (selectedShowtime) {
    return (
      <SeatSelectionView
        showtime={selectedShowtime}
        movie={movie}
        onBack={() => setSelectedShowtime(null)}
        onGoToBookings={onGoToBookings}
      />
    );
  }

  return (
    <main className="movie-detail-page" id="movie-details">
      {status === "loading" ? (
        <div className="empty-state movie-detail-loading" role="status">
          <span
            className="material-symbols-outlined text-primary text-4xl mb-2"
            style={{ animation: "spin 1s linear infinite" }}
          >
            progress_activity
          </span>
          <h2>Loading movie...</h2>
          <p>Getting the details and auditorium programming for this film.</p>
        </div>
      ) : status === "not-found" ? (
        <div className="empty-state" role="alert">
          <span className="material-symbols-outlined text-primary text-4xl mb-2">
            search_off
          </span>
          <h2>Movie not found</h2>
          <p>This movie may have been removed or the link may be incorrect.</p>
          <button className="secondary-button" onClick={onBack} type="button">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              arrow_back
            </span>
            <span>← Back to Movies</span>
          </button>
        </div>
      ) : status === "error" ? (
        <div className="empty-state" role="alert">
          <span className="material-symbols-outlined text-primary text-4xl mb-2">
            error
          </span>
          <h2>We couldn’t load this movie</h2>
          <p>{errorMessage}</p>
          <button className="secondary-button" onClick={retryLoading} type="button">
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              refresh
            </span>
            <span>Try again</span>
          </button>
        </div>
      ) : (
        <>
          <MovieDetailsHeader
            movie={movie}
            isSaved={savedMovieIds.includes(movieId)}
            onToggleSaved={toggleSaved}
            onBack={onBack}
          />
          <div id="showtimes">
            <ShowtimesSection
              movieId={movieId}
              movie={movie}
              onSelectShowtime={(showtime) => {
                setSelectedShowtime(showtime);
                window.scrollTo(0, 0);
              }}
            />
          </div>
        </>
      )}
    </main>
  );
}
