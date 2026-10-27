import { useState, useEffect, useMemo } from "react";
import { getShowtimesByMovieId } from "./showtimeApi.js";
import { DateTabs } from "./DateTabs.jsx";
import { CinemaShowtimeGroup } from "./CinemaShowtimeGroup.jsx";
import { Spinner } from "../../shared/components/Spinner/Spinner.jsx";
import { EmptyState } from "../../shared/components/EmptyState/EmptyState.jsx";
import { getShowtimeDateKey } from "../../core/utils/date.js";

export function ShowtimesSection({ movieId, onSelectShowtime }) {
  const [showtimes, setShowtimes] = useState([]);
  const [loadStatus, setLoadStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState("");

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    getShowtimesByMovieId(movieId, { signal: controller.signal })
      .then((data) => {
        if (!ignore) {
          setShowtimes(data);
          setLoadStatus("success");

          // Set initial selected date key to first available date
          if (data.length > 0) {
            const firstDate = getShowtimeDateKey(data[0].startsAt);
            setSelectedDateKey(firstDate);
          }
        }
      })
      .catch((err) => {
        if (!ignore) {
          if (controller.signal.aborted) return;
          setLoadError(err.message || "Failed to load showtimes.");
          setLoadStatus("error");
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [movieId]);

  // Extract sorted unique date keys
  const dateKeys = useMemo(() => {
    const keys = new Set();
    showtimes.forEach((st) => {
      const key = getShowtimeDateKey(st.startsAt);
      if (key) keys.add(key);
    });
    return Array.from(keys).sort();
  }, [showtimes]);

  // Group showtimes for selected date by Cinema -> Screen
  const groupedShowtimes = useMemo(() => {
    if (!selectedDateKey) return {};

    const filtered = showtimes.filter(
      (st) => getShowtimeDateKey(st.startsAt) === selectedDateKey,
    );

    const cinemaGroups = {};
    filtered.forEach((st) => {
      const cinema = st.cinemaName || "Cinevo Grand";
      const screen = st.screenName || "Screen 1";

      if (!cinemaGroups[cinema]) {
        cinemaGroups[cinema] = {};
      }
      if (!cinemaGroups[cinema][screen]) {
        cinemaGroups[cinema][screen] = [];
      }
      cinemaGroups[cinema][screen].push(st);
    });

    return cinemaGroups;
  }, [showtimes, selectedDateKey]);

  return (
    <section className="showtimes-section">
      <div className="showtimes-header">
        <span className="section-kicker">SELECT SCREENING TIME</span>
        <h2>Available Showtimes</h2>
      </div>

      {loadStatus === "loading" && (
        <div className="status-panel">
          <Spinner message="Retrieving screening schedules..." />
        </div>
      )}

      {loadStatus === "error" && (
        <div className="status-panel error-panel" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">
            error
          </span>
          <p>{loadError}</p>
        </div>
      )}

      {loadStatus === "success" && showtimes.length === 0 && (
        <EmptyState
          icon="event_busy"
          title="No scheduled screenings"
          description="There are currently no scheduled screenings for this movie. Check back soon for updated showtimes."
        />
      )}

      {loadStatus === "success" && showtimes.length > 0 && (
        <>
          <DateTabs
            dateKeys={dateKeys}
            selectedDateKey={selectedDateKey}
            onSelectDate={setSelectedDateKey}
          />

          <div className="cinemas-list">
            {Object.entries(groupedShowtimes).map(([cinemaName, screenGroups]) => (
              <CinemaShowtimeGroup
                key={cinemaName}
                cinemaName={cinemaName}
                screenGroups={screenGroups}
                onSelectShowtime={onSelectShowtime}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
