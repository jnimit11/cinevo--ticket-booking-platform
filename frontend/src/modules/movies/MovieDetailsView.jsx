import { useState, useEffect } from "react";
import { getMovieById } from "./movieApi.js";
import { MovieDetailsHeader } from "./MovieDetailsHeader.jsx";
import { ShowtimesSection } from "../showtimes/ShowtimesSection.jsx";
import { SeatSelectionView } from "../booking/SeatSelectionView.jsx";
import { Spinner } from "../../shared/components/Spinner/Spinner.jsx";

export function MovieDetailsView({ movieId, onBack, onGoToBookings }) {
  const [movie, setMovie] = useState(null);
  const [loadStatus, setLoadStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [selectedShowtime, setSelectedShowtime] = useState(null);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    getMovieById(movieId, { signal: controller.signal })
      .then((data) => {
        if (!ignore) {
          setMovie(data);
          setLoadStatus("success");
        }
      })
      .catch((err) => {
        if (!ignore) {
          if (controller.signal.aborted) return;
          setLoadError(err.message || "Failed to load movie details.");
          setLoadStatus("error");
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [movieId]);

  if (loadStatus === "loading") {
    return (
      <div className="status-panel">
        <Spinner message="Retrieving screening information..." />
      </div>
    );
  }

  if (loadStatus === "error") {
    return (
      <div className="status-panel error-panel" role="alert">
        <span className="material-symbols-outlined" aria-hidden="true">
          error
        </span>
        <p>{loadError}</p>
        <button className="primary-button" type="button" onClick={onBack}>
          Return to Movies
        </button>
      </div>
    );
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
    <div className="movie-details-view">
      <MovieDetailsHeader movie={movie} onBack={onBack} />
      <ShowtimesSection
        movieId={movieId}
        onSelectShowtime={(showtime) => {
          setSelectedShowtime(showtime);
          window.scrollTo(0, 0);
        }}
      />
    </div>
  );
}
