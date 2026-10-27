import { useState, useEffect, useMemo } from "react";
import { getShowtimesByMovieId } from "./showtimeApi.js";
import {
  formatShowtimeDateParts,
  formatShowtimeTime,
  formatShowtimeDateTime,
  getShowtimeDateKey,
} from "../../core/utils/date.js";
import { formatTicketPrice } from "../../core/utils/currency.js";

export function ShowtimesSection({ movieId, movie, onSelectShowtime }) {
  const [showtimes, setShowtimes] = useState([]);
  const [activeDockShowtime, setActiveDockShowtime] = useState(null);
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    getShowtimesByMovieId(movieId, { signal: controller.signal })
      .then((loadedShowtimes) => {
        setShowtimes(loadedShowtimes);
        if (loadedShowtimes && loadedShowtimes.length > 0) {
          setActiveDockShowtime(loadedShowtimes[0]);
        }
        setStatus("success");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setErrorMessage(error.message || "Unable to load showtimes.");
        setStatus("error");
      });

    return () => controller.abort();
  }, [movieId, loadAttempt]);

  const uniqueDateKeys = useMemo(() => {
    const set = new Set();
    showtimes.forEach((s) => {
      const key = getShowtimeDateKey(s.startsAt);
      if (key) set.add(key);
    });
    return Array.from(set).sort();
  }, [showtimes]);

  const activeDateKey =
    selectedDateKey && uniqueDateKeys.includes(selectedDateKey)
      ? selectedDateKey
      : uniqueDateKeys[0] || "";

  const dateFilteredShowtimes = useMemo(() => {
    if (!activeDateKey) return showtimes;
    return showtimes.filter((s) => getShowtimeDateKey(s.startsAt) === activeDateKey);
  }, [showtimes, activeDateKey]);

  const venues = useMemo(() => {
    const map = new Map();
    dateFilteredShowtimes.forEach((s) => {
      const venueName = s.cinemaName || "Cinevo Flagship Cinema";
      if (!map.has(venueName)) {
        map.set(venueName, {
          name: venueName,
          city: s.city || "",
          screenName: s.screenName || "",
          screenFormat: s.screenFormat || "",
          showtimes: [],
        });
      }
      map.get(venueName).showtimes.push(s);
    });
    return Array.from(map.values());
  }, [dateFilteredShowtimes]);

  function retryLoading() {
    setErrorMessage("");
    setStatus("loading");
    setLoadAttempt((attempt) => attempt + 1);
  }

  return (
    <section className="showtimes-section" id="showtime-matrix" aria-labelledby="showtimes-heading">
      <div className="showtimes-heading">
        <div>
          <span className="section-kicker">SELECT DATE &amp; AUDITORIUM</span>
          <h2 id="showtimes-heading">Showtime Schedule</h2>
        </div>
        {/* Status Legend */}
        <div className="showtime-legend" aria-label="Showtime Availability Legend">
          <span className="legend-item">
            <span className="legend-dot available" /> Available
          </span>
          <span className="legend-item">
            <span className="legend-dot filling-fast" /> Filling Fast
          </span>
          <span className="legend-item">
            <span className="legend-dot selected" /> Selected
          </span>
          <span className="legend-item">
            <span className="legend-dot sold-out" /> Sold Out
          </span>
        </div>
      </div>

      {status === "loading" ? (
        <div className="empty-state showtimes-state" role="status">
          <span
            className="material-symbols-outlined text-primary text-4xl mb-2"
            style={{ animation: "spin 1s linear infinite" }}
          >
            progress_activity
          </span>
          <h3>Finding showtimes...</h3>
          <p>Checking available screenings and auditorium slots for this movie.</p>
        </div>
      ) : status === "error" ? (
        <div className="empty-state showtimes-state" role="alert">
          <span className="material-symbols-outlined text-primary text-4xl mb-2">warning</span>
          <h3>We couldn’t load showtimes</h3>
          <p>{errorMessage}</p>
          <button className="secondary-button" onClick={retryLoading}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              refresh
            </span>
            <span>Try again</span>
          </button>
        </div>
      ) : showtimes.length === 0 ? (
        <div className="empty-state showtimes-state">
          <span className="material-symbols-outlined" style={{ fontSize: "36px", color: "#ffb3b6" }}>
            event_busy
          </span>
          <h3>No showtimes available</h3>
          <p>
            There are no screenings listed for this movie right now. Check back soon or inquire for private
            bookings.
          </p>
        </div>
      ) : (
        <>
          {/* Date Filter Ribbon */}
          {uniqueDateKeys.length > 1 && (
            <div className="showtime-date-ribbon" role="tablist" aria-label="Screening Dates">
              {uniqueDateKeys.map((dateKey) => {
                const isSelected = dateKey === activeDateKey;
                const { relativeLabel, dayName, dayMonth } = formatShowtimeDateParts(dateKey);
                const count = showtimes.filter((s) => getShowtimeDateKey(s.startsAt) === dateKey).length;

                return (
                  <button
                    key={dateKey}
                    role="tab"
                    aria-selected={isSelected}
                    className={`date-tab-card ${isSelected ? "active" : ""}`}
                    type="button"
                    onClick={() => {
                      setSelectedDateKey(dateKey);
                      const firstInDate = showtimes.find(
                        (s) => getShowtimeDateKey(s.startsAt) === dateKey,
                      );
                      if (firstInDate) setActiveDockShowtime(firstInDate);
                    }}
                  >
                    <div className="date-tab-top">
                      <span className="date-tab-rel">{relativeLabel}</span>
                      <span className="date-tab-pill">{dayMonth}</span>
                    </div>
                    <div className="date-tab-bottom">
                      <span className="date-tab-day">{dayName}</span>
                      <span className="date-tab-count">
                        {count} {count === 1 ? "Screening" : "Screenings"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Venues & Showtime Matrix */}
          <div className="venue-card-list">
            {venues.map((venue) => {
              const formats = Array.from(
                new Set(venue.showtimes.map((s) => s.screenFormat).filter(Boolean)),
              );
              const prices = venue.showtimes
                .map((s) => s.priceInPaise)
                .filter((p) => Number.isFinite(p) && p >= 0);
              const minPrice = prices.length > 0 ? Math.min(...prices) : null;
              const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

              return (
                <div className="venue-card" key={venue.name}>
                  <div className="venue-card-header">
                    <div className="venue-info-block">
                      <div className="venue-title-row">
                        <span className="material-symbols-outlined venue-icon">theater_comedy</span>
                        <h3 className="venue-title">{venue.name}</h3>
                        {venue.city && <span className="venue-badge">{venue.city}</span>}
                      </div>
                      <p className="venue-subtitle">
                        {[venue.city, venue.screenName || "Flagship Auditorium"]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <div className="venue-format-tags">
                      {formats.length > 0 ? (
                        formats.map((fmt) => (
                          <span key={fmt} className="format-tag">
                            {fmt}
                          </span>
                        ))
                      ) : (
                        <>
                          <span className="format-tag">IMAX Laser</span>
                          <span className="format-tag">Dolby 12-Channel</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="venue-auditorium-block">
                    <div className="auditorium-bar">
                      <span className="auditorium-title">
                        <span className="material-symbols-outlined verified-icon">verified</span>
                        {venue.screenName || "Auditorium 1"} · {venue.screenFormat || "Dolby Atmos Master"}
                      </span>
                      {minPrice !== null && (
                        <span className="auditorium-price-range">
                          {formatTicketPrice(minPrice)}
                          {maxPrice !== null && maxPrice !== minPrice
                            ? ` – ${formatTicketPrice(maxPrice)}`
                            : ""}
                        </span>
                      )}
                    </div>

                    <div className="showtime-grid">
                      {venue.showtimes.map((showtime) => {
                        const timeStr = formatShowtimeTime(showtime.startsAt);
                        const fullDateTime = formatShowtimeDateTime(showtime.startsAt);
                        const ticketPrice = formatTicketPrice(showtime.priceInPaise);
                        const isSelected = activeDockShowtime?.id === showtime.id;

                        return (
                          <article
                            key={showtime.id}
                            className={`showtime-card ${isSelected ? "active-slot" : ""}`}
                            onMouseEnter={() => setActiveDockShowtime(showtime)}
                            onClick={() => setActiveDockShowtime(showtime)}
                          >
                            <div className="showtime-card-top">
                              <span className="showtime-slot-time">{timeStr || fullDateTime}</span>
                              <span className="showtime-status-pill available">Available</span>
                            </div>

                            <div className="showtime-card-mid">
                              <span className="showtime-slot-format">
                                {showtime.screenFormat || "4K Laser"}
                              </span>
                              {ticketPrice && <span className="showtime-price">{ticketPrice}</span>}
                            </div>

                            <button
                              className="showtime-select-button"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectShowtime(showtime);
                              }}
                              aria-label={`Select seats for ${showtime.cinemaName || "Screening"} at ${timeStr || fullDateTime}`}
                            >
                              Select Seats <span>→</span>
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selection Summary Sticky Booking Dock */}
          {activeDockShowtime && (
            <aside className="sticky-booking-dock" aria-label="Showtime Selection Dock">
              <div className="sticky-dock-content">
                <div className="dock-left">
                  {movie?.posterUrl && (
                    <div className="dock-mini-poster">
                      <img src={movie.posterUrl} alt="" />
                    </div>
                  )}
                  <div className="dock-text-group">
                    <div className="dock-meta-line">
                      <span className="dock-movie-title">{movie?.title || "Selected Feature"}</span>
                      <span className="dock-sep">•</span>
                      <span className="dock-venue-name">
                        {activeDockShowtime.cinemaName || "Cinevo Auditorium"}
                      </span>
                      <span className="dock-sep">•</span>
                      <span className="dock-time-val">
                        {formatShowtimeDateTime(activeDockShowtime.startsAt)}
                      </span>
                      {activeDockShowtime.screenFormat && (
                        <>
                          <span className="dock-sep">•</span>
                          <span className="dock-format-chip">
                            {activeDockShowtime.screenFormat}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="dock-right">
                  <div className="dock-pricing">
                    <span className="dock-price-sub">Ticket Price</span>
                    <span className="dock-price-main">
                      {formatTicketPrice(activeDockShowtime.priceInPaise)}
                    </span>
                  </div>

                  <button
                    className="primary-button dock-cta-btn"
                    type="button"
                    onClick={() => onSelectShowtime(activeDockShowtime)}
                  >
                    <span>Select Seats</span>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            </aside>
          )}
        </>
      )}
    </section>
  );
}
