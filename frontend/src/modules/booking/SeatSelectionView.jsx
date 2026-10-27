import { useState, useEffect, useMemo, useRef } from "react";
import { getSeatsForShowtime, createBooking } from "./bookingApi.js";
import { useAuth } from "../auth/index.js";
import { AuthForm } from "../auth/AuthForm.jsx";
import { Modal } from "../../shared/components/Modal/Modal.jsx";
import { MAX_BOOKING_SEATS } from "../../core/config/constants.js";
import { formatShowtimeDateTime, formatReleaseDate } from "../../core/utils/date.js";
import { formatTicketPrice } from "../../core/utils/currency.js";

function getSeatLabel(seat) {
  if (!seat) return "";
  return `${seat.rowLabel || ""}${seat.seatNumber || ""}`;
}

export function SeatSelectionView({
  showtime,
  movie,
  onBack,
  onGoToBookings,
}) {
  const [seats, setSeats] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState(() => new Set());
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authError, setAuthError] = useState("");
  const [bookingStatus, setBookingStatus] = useState("idle");
  const [bookingError, setBookingError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [viewStep, setViewStep] = useState("seats");
  const bookingInFlight = useRef(false);

  const { user, token, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const controller = new AbortController();

    getSeatsForShowtime(showtime.id, { signal: controller.signal })
      .then((loadedSeats) => {
        setSeats(loadedSeats);
        setSelectedSeatIds(new Set());
        setStatus("success");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setErrorMessage(error.message || "Unable to load this seat layout.");
        setStatus("error");
      });

    return () => controller.abort();
  }, [showtime.id, loadAttempt]);

  const seatsByRow = useMemo(() => {
    const rows = new Map();
    seats.forEach((seat) => {
      if (!rows.has(seat.rowLabel)) rows.set(seat.rowLabel, []);
      rows.get(seat.rowLabel).push(seat);
    });
    return rows;
  }, [seats]);

  const selectedSeats = seats.filter((seat) => selectedSeatIds.has(seat.id));
  const ticketPrice = showtime.priceInPaise;
  const totalPrice =
    Number.isFinite(ticketPrice) && ticketPrice >= 0
      ? ticketPrice * selectedSeats.length
      : null;

  function toggleSeat(seat) {
    if (
      seat.status !== "available" ||
      (!selectedSeatIds.has(seat.id) && selectedSeatIds.size >= MAX_BOOKING_SEATS)
    )
      return;

    setSelectedSeatIds((current) => {
      const next = new Set(current);
      if (next.has(seat.id)) {
        next.delete(seat.id);
      } else {
        next.add(seat.id);
      }
      return next;
    });
  }

  function retryLoading() {
    setSeats([]);
    setSelectedSeatIds(new Set());
    setErrorMessage("");
    setStatus("loading");
    setLoadAttempt((attempt) => attempt + 1);
  }

  async function submitBooking() {
    if (!token) {
      setShowAuthForm(true);
      setAuthError("Sign in or create an account before booking.");
      return;
    }

    if (selectedSeatIds.size === 0 || bookingInFlight.current) return;

    bookingInFlight.current = true;
    setBookingStatus("loading");
    setBookingError("");

    try {
      const result = await createBooking(
        { showtimeId: showtime.id, seatIds: [...selectedSeatIds] },
        token,
      );
      setConfirmation(result);
      setBookingStatus("success");
    } catch (error) {
      if (error.status === 401) {
        logout();
        setShowAuthForm(true);
        setAuthError("Your sign-in has expired. Please sign in again.");
      } else if (error.status === 409) {
        setBookingError(
          "One or more selected seats are no longer available. Seat availability has been refreshed.",
        );
        try {
          const refreshedSeats = await getSeatsForShowtime(showtime.id);
          setSeats(refreshedSeats);
          setSelectedSeatIds(
            (current) =>
              new Set(
                [...current].filter((seatId) =>
                  refreshedSeats.some(
                    (seat) => seat.id === seatId && seat.status === "available",
                  ),
                ),
              ),
          );
        } catch (refreshError) {
          setBookingError(
            `The selected seats may no longer be available. Refresh failed: ${refreshError.message}`,
          );
        }
      } else {
        setBookingError(error.message || "Unable to create the booking.");
      }

      setBookingStatus("error");
    } finally {
      bookingInFlight.current = false;
    }
  }

  const confirmationSeatIds = new Set(
    confirmation?.seats?.map((seat) => seat.seatId) ?? [],
  );
  const confirmedSeats = seats.filter((seat) => confirmationSeatIds.has(seat.id));
  const finalConfirmedSeats =
    confirmedSeats.length > 0 ? confirmedSeats : selectedSeats;

  return (
    <section className="seat-selection" aria-labelledby="seat-selection-heading">
      {/* 1. Sub-navigation Context Strip & Booking Stepper */}
      <div className="booking-context-strip">
        <div className="booking-context-inner">
          <div className="booking-meta-group">
            <button
              className="booking-back-link"
              type="button"
              onClick={viewStep === "review" ? () => setViewStep("seats") : onBack}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_back
              </span>
              <span>
                {viewStep === "review"
                  ? `Modify Seats (${movie?.title || "Screening"})`
                  : "Back to Showtimes"}
              </span>
            </button>
            <div className="booking-meta-divider" aria-hidden="true" />
            <div className="showtime-meta-pill">
              <span className="meta-pulse-dot" aria-hidden="true" />
              <span className="meta-movie-title">
                {movie?.title || showtime.movieTitle || "Exclusive Screening"}
              </span>
              <span className="meta-sep" aria-hidden="true">
                •
              </span>
              <span className="meta-time">
                {formatShowtimeDateTime(showtime.startsAt)}
              </span>
              {showtime.screenName && (
                <>
                  <span className="meta-sep" aria-hidden="true">
                    •
                  </span>
                  <span className="meta-screen">{showtime.screenName}</span>
                </>
              )}
            </div>
          </div>

          <nav aria-label="Booking progress" className="booking-stepper">
            <div className="stepper-step completed">
              <span className="stepper-badge">
                <span className="material-symbols-outlined" aria-hidden="true">
                  check
                </span>
              </span>
              <span className="stepper-label">1. Film</span>
            </div>
            <div className="stepper-line" aria-hidden="true" />
            <div className="stepper-step completed">
              <span className="stepper-badge">
                <span className="material-symbols-outlined" aria-hidden="true">
                  check
                </span>
              </span>
              <span className="stepper-label">2. Showtime</span>
            </div>
            <div className="stepper-line" aria-hidden="true" />
            <div
              className={`stepper-step ${viewStep === "review" || confirmation ? "completed" : "active"}`}
            >
              <span className="stepper-badge">
                {viewStep === "review" || confirmation ? (
                  <span className="material-symbols-outlined" aria-hidden="true">
                    check
                  </span>
                ) : (
                  "3"
                )}
              </span>
              <span className="stepper-label">3. Choose Seats</span>
            </div>
            <div className="stepper-line" aria-hidden="true" />
            <div
              className={`stepper-step ${confirmation ? "completed" : viewStep === "review" ? "active" : "pending"}`}
            >
              <span className="stepper-badge">
                {confirmation ? (
                  <span className="material-symbols-outlined" aria-hidden="true">
                    check
                  </span>
                ) : (
                  "4"
                )}
              </span>
              <span className="stepper-label">4. Review &amp; Confirm</span>
            </div>
          </nav>
        </div>
      </div>

      <div className="seat-selection-heading visually-hidden">
        <span className="section-kicker">
          {showtime.cinemaName}
          {showtime.city ? ` · ${showtime.city}` : ""}
        </span>
        <h3 id="seat-selection-heading">Select your seats</h3>
        {showtime.startsAt && (
          <p>
            {formatShowtimeDateTime(showtime.startsAt)}
            {showtime.screenName ? ` · ${showtime.screenName}` : ""}
          </p>
        )}
      </div>

      {status === "loading" ? (
        <div className="empty-state showtimes-state" role="status">
          <span
            className="material-symbols-outlined text-primary text-4xl mb-2"
            style={{ animation: "spin 1s linear infinite" }}
          >
            progress_activity
          </span>
          <h3>Loading seat layout...</h3>
          <p>Checking availability for this screening.</p>
        </div>
      ) : status === "error" ? (
        <div className="empty-state showtimes-state" role="alert">
          <span className="material-symbols-outlined text-primary text-4xl mb-2">warning</span>
          <h3>We couldn’t load seats</h3>
          <p>{errorMessage}</p>
          <button className="secondary-button" onClick={retryLoading}>
            Try again
          </button>
        </div>
      ) : seats.length === 0 ? (
        <div className="empty-state showtimes-state">
          <span className="material-symbols-outlined" style={{ fontSize: "36px", color: "#ffb3b6" }}>
            event_busy
          </span>
          <h3>No seat layout available</h3>
          <p>This screening does not have any seats listed.</p>
        </div>
      ) : confirmation ? (
        /* PHASE 5: DIGITAL CINEMA PASS CONFIRMATION */
        <div className="digital-ticket-container" role="status">
          {/* Top Control Bar */}
          <div className="digital-ticket-top-bar">
            <button className="booking-back-link" type="button" onClick={onBack}>
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_back
              </span>
              <span>Back to Movies</span>
            </button>
            <div className="ticket-meta-badges">
              {confirmation.booking.createdAt && (
                <span className="ticket-issued-pill">
                  Issued: {formatShowtimeDateTime(confirmation.booking.createdAt)}
                </span>
              )}
              <span className="ticket-confirmed-badge">
                <span className="material-symbols-outlined" aria-hidden="true">
                  check_circle
                </span>
                <span>RESERVATION CONFIRMED</span>
              </span>
            </div>
          </div>

          {/* Central Luxury Boarding Pass Ticket */}
          <article className="ticket-board-pass booking-confirmation">
            {/* Ambient Lighting Overlay */}
            <div className="ticket-ambient-glow" aria-hidden="true" />

            {/* Left / Main Ticket Body */}
            <div className="ticket-main-body">
              {/* Film Title, Poster & Specs */}
              <div className="ticket-film-header">
                {movie?.posterUrl ? (
                  <img
                    src={movie.posterUrl}
                    alt={movie.title || "Movie Poster"}
                    className="ticket-film-poster"
                  />
                ) : (
                  <div className="ticket-film-poster-placeholder" aria-hidden="true">
                    <span className="material-symbols-outlined">movie</span>
                  </div>
                )}
                <div className="ticket-film-info">
                  <div className="ticket-badges-row">
                    {movie?.language && (
                      <span className="ticket-format-badge">{movie.language}</span>
                    )}
                    {movie?.durationMinutes && (
                      <span className="ticket-spec-badge">
                        {movie.durationMinutes} Min
                      </span>
                    )}
                    {showtime.screenName && (
                      <span className="ticket-spec-badge">{showtime.screenName}</span>
                    )}
                  </div>
                  <h2 className="ticket-film-title">
                    {movie?.title || showtime.movieTitle || "Exclusive Screening"}
                  </h2>
                  <p className="ticket-film-director">
                    {[
                      movie?.language,
                      movie?.durationMinutes ? `${movie.durationMinutes} min` : "",
                      movie?.releaseDate
                        ? `Released ${formatReleaseDate(movie.releaseDate)}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {showtime.screenName && (
                    <div className="ticket-audio-spec">
                      <span className="material-symbols-outlined" aria-hidden="true">
                        theater_comedy
                      </span>
                      <span>Auditorium: {showtime.screenName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Venue & Coordinates Grid */}
              <div className="ticket-coords-grid booking-confirmation-details">
                <div className="ticket-coord-item">
                  <span className="coord-label">CINEMA COMPLEX</span>
                  <strong className="coord-value">{showtime.cinemaName}</strong>
                  <span className="coord-sub">
                    {showtime.city || "Flagship Auditorium"}
                  </span>
                </div>
                <div className="ticket-coord-item">
                  <span className="coord-label">AUDITORIUM</span>
                  <strong className="coord-value primary">
                    {showtime.screenName || "AUDI 01"}
                  </strong>
                  <span className="coord-sub">Reserved Auditorium Screen</span>
                </div>
                <div className="ticket-coord-item">
                  <span className="coord-label">DATE &amp; SHOWTIME</span>
                  <strong className="coord-value">
                    {formatShowtimeDateTime(showtime.startsAt)}
                  </strong>
                  <span className="coord-sub gold">Doors open 30 mins prior</span>
                </div>
              </div>

              {/* Seating Allocation & Total */}
              <div className="ticket-seating-row">
                <div>
                  <span className="coord-label">ALLOCATED SEATS</span>
                  <div className="ticket-seats-lead">
                    <strong className="ticket-seats-text">
                      {finalConfirmedSeats.length
                        ? finalConfirmedSeats.map(getSeatLabel).join(", ")
                        : "Seat labels unavailable"}
                    </strong>
                    <span className="ticket-seats-count">
                      ({finalConfirmedSeats.length} Admissions)
                    </span>
                  </div>
                  <span className="ticket-tier-text">
                    Reserved Auditorium Seating · Present booking reference for entry
                  </span>
                </div>
                <div className="ticket-total-box">
                  <span className="coord-label">TOTAL REMITTANCE</span>
                  <strong className="ticket-total-price">
                    {Number.isFinite(confirmation.booking.totalAmountInPaise)
                      ? formatTicketPrice(confirmation.booking.totalAmountInPaise)
                      : formatTicketPrice(totalPrice)}
                  </strong>
                  <span className="ticket-tax-note">
                    All taxes and box office charges included in ticket total
                  </span>
                </div>
              </div>
            </div>

            {/* Perforation Separator */}
            <div className="ticket-perforation-sep" aria-hidden="true">
              <div className="notch-cut notch-top" />
              <div className="perforation-line" />
              <div className="notch-cut notch-bottom" />
            </div>

            {/* Right / Scannable Gate Pass Stub */}
            <div className="ticket-stub">
              <div className="stub-header">
                <span className="stub-label">GATE PASS</span>
                <span className="stub-badge">VALID FOR ENTRY</span>
              </div>

              {/* Scannable Vector QR Module (Illustrative) */}
              <div className="ticket-qr-box">
                <svg
                  className="ticket-qr-svg"
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label={`Illustrative digital entry pass for booking reference ${confirmation.booking.id}. Present Ref ID for entry.`}
                >
                  <rect fill="currentColor" height="28" rx="2" width="28" x="5" y="5" />
                  <rect fill="#0e0e13" height="20" rx="1" width="20" x="9" y="9" />
                  <rect fill="currentColor" height="12" rx="1" width="12" x="13" y="13" />
                  <rect fill="currentColor" height="28" rx="2" width="28" x="67" y="5" />
                  <rect fill="#0e0e13" height="20" rx="1" width="20" x="71" y="9" />
                  <rect fill="currentColor" height="12" rx="1" width="12" x="75" y="13" />
                  <rect fill="currentColor" height="28" rx="2" width="28" x="5" y="67" />
                  <rect fill="#0e0e13" height="20" rx="1" width="20" x="9" y="71" />
                  <rect fill="currentColor" height="12" rx="1" width="12" x="13" y="75" />
                  <rect fill="currentColor" height="6" width="6" x="38" y="6" />
                  <rect fill="currentColor" height="6" width="6" x="48" y="10" />
                  <rect fill="currentColor" height="6" width="5" x="58" y="6" />
                  <rect fill="currentColor" height="6" width="6" x="38" y="18" />
                  <rect fill="currentColor" height="6" width="7" x="48" y="24" />
                  <rect fill="currentColor" height="6" width="6" x="10" y="38" />
                  <rect fill="currentColor" height="6" width="6" x="20" y="44" />
                  <rect fill="currentColor" height="6" width="6" x="28" y="38" />
                  <rect fill="currentColor" height="6" width="6" x="38" y="38" />
                  <rect fill="#c93b4e" height="8" width="8" x="48" y="36" />
                  <rect fill="currentColor" height="6" width="6" x="62" y="38" />
                  <rect fill="currentColor" height="6" width="6" x="72" y="42" />
                  <rect fill="currentColor" height="6" width="6" x="84" y="38" />
                  <rect fill="currentColor" height="8" width="6" x="38" y="48" />
                  <rect fill="currentColor" height="6" width="8" x="50" y="50" />
                  <rect fill="currentColor" height="6" width="6" x="64" y="48" />
                  <rect fill="currentColor" height="6" width="6" x="78" y="52" />
                  <rect fill="currentColor" height="6" width="6" x="38" y="62" />
                  <rect fill="currentColor" height="6" width="8" x="48" y="68" />
                  <rect fill="currentColor" height="6" width="6" x="62" y="62" />
                  <rect fill="currentColor" height="8" width="6" x="74" y="68" />
                  <rect fill="currentColor" height="6" width="6" x="86" y="62" />
                  <rect fill="currentColor" height="6" width="6" x="38" y="76" />
                  <rect fill="currentColor" height="8" width="6" x="52" y="80" />
                  <rect fill="currentColor" height="6" width="8" x="66" y="78" />
                  <rect fill="currentColor" height="6" width="6" x="80" y="82" />
                  <rect fill="currentColor" height="6" width="6" x="42" y="88" />
                  <rect fill="currentColor" height="6" width="6" x="70" y="88" />
                </svg>
                <span className="stub-scan-caption">
                  Admit {finalConfirmedSeats.length} · Present Ref ID at Concierge
                </span>
                <small className="stub-watermark" style={{ fontSize: "10px", color: "#8f8b95" }}>
                  (Illustrative Digital Entry Pass)
                </small>
              </div>

              {/* Pass ID Reference */}
              <div className="stub-ref-box">
                <span className="booking-reference stub-ref-id">
                  Ref: <strong>{confirmation.booking.id}</strong>
                </span>
                <span className="stub-watermark">Cinevo Verified Pass</span>
              </div>

              <div className="stub-service-indicator">
                <span className="material-symbols-outlined" aria-hidden="true">
                  room_service
                </span>
                <span>In-Seat Attendant Privileges Included</span>
              </div>
            </div>
          </article>

          {/* Ticket Utilities & Wallet Export Actions Bar */}
          <div className="ticket-actions-bar">
            <div className="ticket-actions-left">
              <button
                className="primary-button ticket-view-bookings-btn"
                type="button"
                onClick={onGoToBookings || (() => { window.location.hash = "#bookings"; })}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  confirmation_number
                </span>
                <span>View My Bookings</span>
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => window.print()}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  print
                </span>
                <span>Print / Save Pass</span>
              </button>
            </div>
            <button className="secondary-button" type="button" onClick={onBack}>
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_back
              </span>
              <span>Return to Movies</span>
            </button>
          </div>
        </div>
      ) : viewStep === "review" ? (
        /* PHASE 5: BOOKING REVIEW SCREEN */
        <div className="booking-review-container">
          <div className="booking-review-layout">
            {/* Left Primary Column: Film Details, Venue, Seats, Patron Liaison & Screening Protocols */}
            <div className="review-primary-col">
              {/* SECTION A: Cinema & Film Details Card */}
              <div className="review-card review-film-card">
                <div className="review-ambient-glow" aria-hidden="true" />
                <div className="review-film-header">
                  {movie?.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={movie.title || "Movie Poster"}
                      className="review-poster"
                    />
                  ) : (
                    <div className="review-poster-placeholder" aria-hidden="true">
                      <span className="material-symbols-outlined">movie</span>
                    </div>
                  )}
                  <div className="review-film-meta">
                    <div className="review-pill-row">
                      {movie?.language && (
                        <span className="review-pill format">{movie.language}</span>
                      )}
                      {movie?.durationMinutes && (
                        <span className="review-pill cert">
                          {movie.durationMinutes} Min
                        </span>
                      )}
                      {showtime.screenName && (
                        <span className="review-pill genre">{showtime.screenName}</span>
                      )}
                    </div>
                    <h2 className="review-film-title">
                      {movie?.title || showtime.movieTitle || "Exclusive Screening"}
                    </h2>
                    <p className="review-film-synopsis">
                      {movie?.description
                        ? movie.description.slice(0, 160) +
                          (movie.description.length > 160 ? "…" : "")
                        : "Experience this cinematic presentation in our private screening auditorium."}
                    </p>
                    <div className="review-specs-ribbon">
                      {showtime.screenName && (
                        <span className="review-spec-chip">
                          <span className="material-symbols-outlined gold" aria-hidden="true">
                            tv
                          </span>
                          <span>{showtime.screenName}</span>
                        </span>
                      )}
                      {movie?.durationMinutes && (
                        <span className="review-spec-chip">
                          <span
                            className="material-symbols-outlined crimson"
                            aria-hidden="true"
                          >
                            schedule
                          </span>
                          <span>{movie.durationMinutes} Minutes</span>
                        </span>
                      )}
                      {movie?.language && (
                        <span className="review-spec-chip">
                          <span className="material-symbols-outlined gold" aria-hidden="true">
                            translate
                          </span>
                          <span>{movie.language}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Structured Venue & Showtime Grid */}
                <div className="review-venue-grid">
                  <div className="review-venue-card">
                    <span
                      className="material-symbols-outlined crimson"
                      aria-hidden="true"
                    >
                      theater_comedy
                    </span>
                    <div>
                      <span className="coord-label">VENUE &amp; AUDITORIUM</span>
                      <strong className="coord-value">{showtime.cinemaName}</strong>
                      <span className="coord-sub">
                        {showtime.screenName || "Audi 01"}
                        {showtime.city ? ` · ${showtime.city}` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="review-venue-card">
                    <span className="material-symbols-outlined gold" aria-hidden="true">
                      schedule
                    </span>
                    <div>
                      <span className="coord-label">DATE &amp; SHOWTIME</span>
                      <strong className="coord-value">
                        {formatShowtimeDateTime(showtime.startsAt)}
                      </strong>
                      <span className="coord-sub">Doors open 30 mins prior</span>
                    </div>
                  </div>
                </div>

                {/* Allocated Seats Ribbon */}
                <div className="review-allocated-ribbon">
                  <div className="review-seats-display">
                    <div className="review-seat-icon-box" aria-hidden="true">
                      <span className="material-symbols-outlined">
                        airline_seat_recline_extra
                      </span>
                    </div>
                    <div>
                      <span className="coord-label">ALLOCATED SEATS</span>
                      <h4 className="review-seats-headline">
                        Seats:{" "}
                        <span className="crimson">
                          {selectedSeats.map(getSeatLabel).join(", ")}
                        </span>{" "}
                        ({selectedSeats.length}{" "}
                        {selectedSeats.length === 1 ? "ticket" : "tickets"})
                      </h4>
                      <p className="review-seats-tier-sub">
                        Royale Recliner / Premium Lounger Seating
                      </p>
                    </div>
                  </div>
                  <button
                    className="review-change-seats-btn"
                    type="button"
                    onClick={() => setViewStep("seats")}
                  >
                    <span>Change Seats</span>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      edit
                    </span>
                  </button>
                </div>
              </div>

              {/* SECTION B: Patron Liaison & Ticket Delivery */}
              <div className="review-card">
                <div className="review-card-heading">
                  <div className="review-heading-group">
                    <span className="material-symbols-outlined crimson" aria-hidden="true">
                      badge
                    </span>
                    <h3>Patron Liaison &amp; Ticket Delivery</h3>
                  </div>
                  <span className="vip-status-badge">
                    <span className="material-symbols-outlined gold" aria-hidden="true">
                      stars
                    </span>
                    <span>Royale Club Member</span>
                  </span>
                </div>
                <div className="review-patron-grid">
                  <div className="review-patron-card">
                    <span className="coord-label">PRIMARY PATRON</span>
                    <strong className="coord-value">
                      {user?.name || "Valued Patron"}
                    </strong>
                    <span className="coord-sub gold">Verified Account</span>
                  </div>
                  <div className="review-patron-card">
                    <span className="coord-label">VERIFIED EMAIL</span>
                    <strong className="coord-value truncate">
                      {user?.email || "Registered User"}
                    </strong>
                    <span className="coord-sub">Instant E-Ticket Dispatch</span>
                  </div>
                  <div className="review-patron-card">
                    <span className="coord-label">PASS DELIVERY</span>
                    <strong className="coord-value">Digital Entry Pass</strong>
                    <span className="coord-sub">Present Ref ID at Foyer</span>
                  </div>
                </div>
                <div className="review-delivery-note">
                  <span className="material-symbols-outlined crimson" aria-hidden="true">
                    qr_code_scanner
                  </span>
                  <p>
                    Instant contactless digital cinema pass with booking confirmation
                    reference will be generated immediately upon completing checkout.
                  </p>
                </div>
              </div>

              {/* SECTION C: Screening Protocols & Admission Charter */}
              <div className="review-card">
                <div className="review-card-heading">
                  <div className="review-heading-group">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      policy
                    </span>
                    <h3>Screening Protocols &amp; Privileges</h3>
                  </div>
                </div>
                <div className="review-protocol-list">
                  <div className="review-protocol-item">
                    <span className="material-symbols-outlined crimson" aria-hidden="true">
                      verified_user
                    </span>
                    <div>
                      <strong className="protocol-title">Admission &amp; Verification:</strong>
                      <span>
                        {" "}
                        Present your booking reference ID at the foyer reception desk for
                        reservation verification prior to seating.
                      </span>
                    </div>
                  </div>
                  <div className="review-protocol-item">
                    <span className="material-symbols-outlined crimson" aria-hidden="true">
                      spatial_audio_off
                    </span>
                    <div>
                      <strong className="protocol-title">Acoustic Immersion:</strong>
                      <span>
                        {" "}
                        Screening features calibrated auditorium acoustics adjusted to optimal
                        cinema presentation levels.
                      </span>
                    </div>
                  </div>
                  <div className="review-protocol-item">
                    <span className="material-symbols-outlined crimson" aria-hidden="true">
                      room_service
                    </span>
                    <div>
                      <strong className="protocol-title">Lounger Privileges:</strong>
                      <span>
                        {" "}
                        Reservation includes allocated auditorium seating, priority admission,
                        and concierge service where available.
                      </span>
                    </div>
                  </div>
                  <div className="review-protocol-item">
                    <span className="material-symbols-outlined crimson" aria-hidden="true">
                      lock_clock
                    </span>
                    <div>
                      <strong className="protocol-title">Reservation Integrity:</strong>
                      <span>
                        {" "}
                        Allocated seats {selectedSeats.map(getSeatLabel).join(", ")} are locked
                        for your order upon confirmation. Active bookings can be reviewed or
                        cancelled anytime via My Bookings.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Secondary Column: Sticky Order Summary & Confirmation CTA */}
            <div className="review-secondary-col">
              <div className="review-card review-summary-card">
                <div className="review-summary-header">
                  <h3>Order Summary</h3>
                  <span className="review-encrypted-badge">
                    <span className="material-symbols-outlined gold" aria-hidden="true">
                      lock
                    </span>
                    <span>256-Bit Encrypted</span>
                  </span>
                </div>

                <div className="review-price-list">
                  <div className="review-price-row">
                    <div>
                      <strong className="price-item-name">
                        {selectedSeats.length} × Cinema Admissions
                      </strong>
                      <span className="coord-sub">
                        {selectedSeats.map(getSeatLabel).join(", ")} ·{" "}
                        {Number.isFinite(ticketPrice)
                          ? formatTicketPrice(ticketPrice)
                          : "—"}{" "}
                        each
                      </span>
                    </div>
                    <strong className="price-item-val font-mono">
                      {totalPrice === null ? "—" : formatTicketPrice(totalPrice)}
                    </strong>
                  </div>

                  <div className="review-grand-total">
                    <div>
                      <span className="total-lead-text">Total Payable</span>
                      <span className="coord-sub">
                        All taxes and box office charges included in ticket total
                      </span>
                    </div>
                    <strong className="review-total-amount font-mono">
                      {totalPrice === null ? "Price unavailable" : formatTicketPrice(totalPrice)}
                    </strong>
                  </div>
                </div>

                {/* Primary Action CTA */}
                <div className="review-actions-box">
                  <button
                    className="primary-button booking-submit-button booking-confirm-submit-button"
                    type="button"
                    disabled={selectedSeatIds.size === 0 || bookingStatus === "loading"}
                    onClick={submitBooking}
                  >
                    <span>
                      {bookingStatus === "loading"
                        ? "Confirming Booking..."
                        : `Confirm Booking · ${formatTicketPrice(totalPrice)}`}
                    </span>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      arrow_forward
                    </span>
                  </button>
                  <small className="review-guarantee-note">
                    Instant scannable digital entry pass allocated upon confirmation.
                  </small>
                </div>

                {bookingError && (
                  <div className="notice booking-error" role="alert">
                    <p>{bookingError}</p>
                    <button
                      className="secondary-button"
                      type="button"
                      style={{ marginTop: "8px", fontSize: "11px", padding: "6px 12px" }}
                      onClick={() => setViewStep("seats")}
                    >
                      Re-select Seats
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* PHASE 4 & 5: SEAT SELECTION ARENA */
        <div className="seat-selection-arena">
          {/* Left Stage: Seat Map */}
          <div className="seat-map-panel">
            {/* Curved Cinema Screen Graphic */}
            <div className="curved-screen-stage">
              <div className="projector-glow" aria-hidden="true" />
              <svg
                className="screen-curve-svg"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 800 64"
                aria-hidden="true"
              >
                <path
                  d="M 20 54 Q 400 6 780 54"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
                <path
                  d="M 40 56 Q 400 14 760 56"
                  stroke="rgba(255,255,255,0.18)"
                  strokeDasharray="4 6"
                  strokeWidth="1"
                />
              </svg>
              <div className="screen-caption">
                <span className="material-symbols-outlined" aria-hidden="true">
                  videocam
                </span>
                <span>
                  All Eyes Forward · Curved Screen Projection
                  {showtime.screenName ? ` · ${showtime.screenName}` : ""}
                </span>
              </div>
            </div>

            {/* Accessible Status Legend */}
            <div className="seat-legend" aria-label="Seat availability legend">
              <div className="legend-item">
                <span className="seat-legend-icon available" aria-hidden="true">
                  1
                </span>
                <span>Available</span>
              </div>
              <div className="legend-item">
                <span className="seat-legend-icon selected" aria-hidden="true">
                  <span className="material-symbols-outlined">check</span>
                </span>
                <span>Selected</span>
              </div>
              <div className="legend-item">
                <span className="seat-legend-icon unavailable" aria-hidden="true">
                  <span className="material-symbols-outlined">close</span>
                </span>
                <span>Occupied</span>
              </div>
              <div className="legend-item">
                <span className="seat-legend-icon premium" aria-hidden="true">
                  <span className="material-symbols-outlined">workspace_premium</span>
                </span>
                <span>Premium / Recliner</span>
              </div>
            </div>

            {/* Seating Grid */}
            <div className="seat-rows-viewport" id="seatMapViewport">
              <div className="seat-rows">
                {[...seatsByRow.entries()].map(([rowLabel, rowSeats]) => {
                  const hasSelectedInRow = rowSeats.some((s) => selectedSeatIds.has(s.id));
                  return (
                    <div className="seat-row" key={rowLabel}>
                      <span className={`seat-row-label ${hasSelectedInRow ? "active" : ""}`}>
                        {rowLabel}
                      </span>
                      <div className="seat-row-items">
                        {rowSeats.map((seat) => {
                          const isSelected = selectedSeatIds.has(seat.id);
                          const isAvailable = seat.status === "available";
                          const isRecliner = Boolean(
                            seat.seatType && /recliner/i.test(seat.seatType),
                          );
                          const isPremium = Boolean(
                            seat.seatType && /premium|vip/i.test(seat.seatType),
                          );
                          const selectionLimitReached =
                            !isSelected && selectedSeatIds.size >= MAX_BOOKING_SEATS;

                          let seatClass = "seat-button";
                          if (isSelected) {
                            seatClass += " selected";
                          } else if (isAvailable) {
                            seatClass += " available";
                            if (isRecliner) seatClass += " recliner";
                            else if (isPremium) seatClass += " premium";
                            if (selectionLimitReached) seatClass += " limit-reached";
                          } else {
                            seatClass += " unavailable";
                          }

                          return (
                            <button
                              className={seatClass}
                              key={seat.id}
                              type="button"
                              disabled={!isAvailable || selectionLimitReached}
                              aria-pressed={isSelected}
                              aria-label={`Seat ${getSeatLabel(seat)}, ${
                                isAvailable
                                  ? isSelected
                                    ? "selected"
                                    : selectionLimitReached
                                      ? "available, booking limit reached"
                                      : "available"
                                  : "unavailable"
                              }, ${seat.seatType}`}
                              title={`${getSeatLabel(seat)} · ${seat.seatType}`}
                              onClick={() => toggleSeat(seat)}
                            >
                              <span className="seat-cushion" aria-hidden="true" />
                              <span className="seat-inner-content">
                                {isSelected ? (
                                  <span
                                    className="material-symbols-outlined seat-glyph"
                                    aria-hidden="true"
                                  >
                                    check
                                  </span>
                                ) : !isAvailable ? (
                                  <span
                                    className="material-symbols-outlined seat-glyph"
                                    aria-hidden="true"
                                  >
                                    close
                                  </span>
                                ) : null}
                                <span className="seat-number-text">{seat.seatNumber}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <span className={`seat-row-label ${hasSelectedInRow ? "active" : ""}`}>
                        {rowLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Summary Rail */}
          <aside
            className="booking-summary-rail"
            aria-live="polite"
            aria-label="Current booking summary"
          >
            <div className="rail-header">
              <div>
                <span className="section-kicker">BOOKING DETAILS</span>
                <h3 className="rail-title">Ticket Summary</h3>
              </div>
              <span className="rail-count-badge">
                {selectedSeats.length} {selectedSeats.length === 1 ? "Seat" : "Seats"} Selected
              </span>
            </div>

            {/* Movie & Hall Mini Dossier */}
            <div className="rail-dossier">
              {movie?.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={movie.title || "Movie Poster"}
                  className="rail-dossier-poster"
                />
              ) : (
                <div className="rail-dossier-poster-placeholder" aria-hidden="true">
                  <span className="material-symbols-outlined">movie</span>
                </div>
              )}
              <div className="rail-dossier-info">
                <h4 className="rail-movie-title">
                  {movie?.title || showtime.movieTitle || "Exclusive Screening"}
                </h4>
                <span className="rail-movie-format">
                  {showtime.screenName || "Main Auditorium"}
                </span>
                <p className="rail-movie-cinema">
                  {showtime.cinemaName}
                  {showtime.city ? ` · ${showtime.city}` : ""}
                </p>
              </div>
            </div>

            {/* Showtime Schedule Grid */}
            <div className="rail-schedule-grid">
              <div className="rail-schedule-item">
                <span className="rail-schedule-label">SHOWTIME</span>
                <span className="rail-schedule-value">
                  {formatShowtimeDateTime(showtime.startsAt)}
                </span>
              </div>
            </div>

            {/* Allocated Seats Listing with Remove Actions */}
            <div className="rail-seats-section">
              <div className="rail-seats-header">
                <span className="section-kicker">ALLOCATED SEATS</span>
                {selectedSeats.length >= MAX_BOOKING_SEATS && (
                  <span className="rail-limit-notice">Max {MAX_BOOKING_SEATS} reached</span>
                )}
              </div>

              {selectedSeats.length === 0 ? (
                <div className="rail-empty-seats">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    chair
                  </span>
                  <p>No seats selected</p>
                  <small>Choose up to {MAX_BOOKING_SEATS} seats on the auditorium map.</small>
                </div>
              ) : (
                <div className="rail-seat-list">
                  {selectedSeats.map((seat) => (
                    <div className="rail-seat-item" key={seat.id}>
                      <div className="rail-seat-badge-group">
                        <span
                          className={`rail-seat-tag ${/premium|recliner/i.test(seat.seatType) ? "premium" : ""}`}
                        >
                          {getSeatLabel(seat)}
                        </span>
                        <div className="rail-seat-meta">
                          <span className="rail-seat-tier">
                            {seat.seatType === "recliner"
                              ? "Royale Recliner"
                              : seat.seatType === "premium"
                                ? "Premium Lounger"
                                : "Standard Seat"}
                          </span>
                          <span className="rail-seat-coord">
                            Row {seat.rowLabel} · Seat {seat.seatNumber}
                          </span>
                        </div>
                      </div>
                      <div className="rail-seat-item-right">
                        <span className="rail-seat-price">
                          {Number.isFinite(ticketPrice)
                            ? formatTicketPrice(ticketPrice)
                            : "—"}
                        </span>
                        <button
                          type="button"
                          className="rail-seat-remove"
                          onClick={() => toggleSeat(seat)}
                          title={`Deselect seat ${getSeatLabel(seat)}`}
                          aria-label={`Deselect seat ${getSeatLabel(seat)}`}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            close
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subtotal & Confirmation Advance */}
            <div className="rail-checkout-block">
              <div className="rail-pricing-row">
                <span className="rail-price-caption">
                  {selectedSeats.length} × Admission Tickets
                </span>
                <span className="rail-price-calc font-mono">
                  {totalPrice === null ? "—" : formatTicketPrice(totalPrice)}
                </span>
              </div>
              <div className="rail-grand-row">
                <span className="rail-grand-caption">Estimated Total</span>
                <span className="rail-grand-total font-mono">
                  {totalPrice === null ? "Select Seats" : formatTicketPrice(totalPrice)}
                </span>
              </div>

              <button
                className="primary-button booking-submit-button"
                type="button"
                disabled={selectedSeatIds.size === 0}
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowAuthForm(true);
                  } else {
                    setViewStep("review");
                    window.scrollTo(0, 0);
                  }
                }}
              >
                <span>Proceed to Review</span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Auth Modal for Unauthenticated Guests */}
      {showAuthForm && (
        <Modal
          isOpen={showAuthForm}
          onClose={() => {
            setShowAuthForm(false);
            setAuthError("");
          }}
          title="Sign in to Complete Booking"
        >
          {authError && (
            <div className="notice auth-modal-notice" role="alert">
              <p>{authError}</p>
            </div>
          )}
          <AuthForm
            initialMode="signin"
            onSuccess={() => {
              setShowAuthForm(false);
              setAuthError("");
              setViewStep("review");
            }}
          />
        </Modal>
      )}
    </section>
  );
}
