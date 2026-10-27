import { useState, useEffect, useMemo, useRef } from "react";
import { getSeatsForShowtime, createBooking } from "./bookingApi.js";
import { ScreenBanner, SeatLegend } from "./SeatLegend.jsx";
import { SeatMatrix } from "./SeatMatrix.jsx";
import { BookingSummaryBar, TicketPass } from "./BookingSummaryBar.jsx";
import { Modal } from "../../shared/components/Modal/Modal.jsx";
import { Spinner } from "../../shared/components/Spinner/Spinner.jsx";
import { AuthForm } from "../auth/AuthForm.jsx";
import { useAuth } from "../auth/index.js";
import { MAX_BOOKING_SEATS } from "../../core/config/constants.js";
import { formatShowtimeDateTime } from "../../core/utils/date.js";

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
  const [bookingStatus, setBookingStatus] = useState("idle");
  const [bookingError, setBookingError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const bookingInFlight = useRef(false);

  const { isAuthenticated, token, logout } = useAuth();

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    getSeatsForShowtime(showtime.id, { signal: controller.signal })
      .then((data) => {
        if (!ignore) {
          setSeats(data);
          setSelectedSeatIds(new Set());
          setStatus("success");
        }
      })
      .catch((err) => {
        if (!ignore) {
          if (controller.signal.aborted) return;
          setErrorMessage(err.message || "Failed to load seat layout.");
          setStatus("error");
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [showtime.id]);

  const seatsByRow = useMemo(() => {
    const rows = new Map();
    seats.forEach((seat) => {
      if (!rows.has(seat.rowLabel)) rows.set(seat.rowLabel, []);
      rows.get(seat.rowLabel).push(seat);
    });
    return rows;
  }, [seats]);

  const selectedSeats = useMemo(() => {
    return seats.filter((s) => selectedSeatIds.has(s.id));
  }, [seats, selectedSeatIds]);

  const toggleSeat = (seat) => {
    if (seat.status !== "available") return;

    setSelectedSeatIds((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) {
        next.delete(seat.id);
      } else {
        if (next.size >= MAX_BOOKING_SEATS) return prev;
        next.add(seat.id);
      }
      return next;
    });
  };

  const handleBookingSubmit = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (selectedSeatIds.size === 0 || bookingInFlight.current) return;

    bookingInFlight.current = true;
    setBookingStatus("loading");
    setBookingError("");

    try {
      const result = await createBooking(
        {
          showtimeId: showtime.id,
          seatIds: Array.from(selectedSeatIds),
        },
        token,
      );

      setConfirmedBooking(result.booking);
      setBookingStatus("success");
    } catch (err) {
      if (err.status === 401) {
        logout();
        setShowAuthModal(true);
      } else if (err.status === 409) {
        setBookingError("Some seats were just booked by another guest. Refreshed availability.");
        try {
          const refreshed = await getSeatsForShowtime(showtime.id);
          setSeats(refreshed);
          setSelectedSeatIds(
            (prev) =>
              new Set(
                [...prev].filter((id) =>
                  refreshed.some((s) => s.id === id && s.status === "available"),
                ),
              ),
          );
        } catch {
          // ignore refresh error
        }
      } else {
        setBookingError(err.message || "Booking failed. Please try again.");
      }
      setBookingStatus("error");
    } finally {
      bookingInFlight.current = false;
    }
  };

  return (
    <div className="seat-selection-view">
      <div className="seat-selection-header">
        <button className="secondary-button back-button" type="button" onClick={onBack}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">
            arrow_back
          </span>
          <span>Return to Showtimes</span>
        </button>

        <div className="screening-summary-header">
          <span className="section-kicker">RESERVE AUDITORIUM SEATS</span>
          <h2 className="screening-title">{movie?.title || "Screening"}</h2>
          <div className="screening-meta-chips">
            <span className="meta-chip">{showtime.cinemaName}</span>
            <span className="meta-chip">{showtime.screenName}</span>
            <span className="meta-chip">{formatShowtimeDateTime(showtime.startsAt)}</span>
          </div>
        </div>
      </div>

      {status === "loading" && (
        <div className="status-panel">
          <Spinner message="Configuring interactive auditorium layout..." />
        </div>
      )}

      {status === "error" && (
        <div className="status-panel error-panel" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">
            error
          </span>
          <p>{errorMessage}</p>
          <button className="primary-button" type="button" onClick={onBack}>
            Back to Showtimes
          </button>
        </div>
      )}

      {status === "success" && (
        <div className="auditorium-container">
          <ScreenBanner />
          <SeatLegend />

          {bookingError && (
            <div className="booking-error-banner" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">
                warning
              </span>
              <span>{bookingError}</span>
            </div>
          )}

          <SeatMatrix
            seatsByRow={seatsByRow}
            selectedSeatIds={selectedSeatIds}
            onToggleSeat={toggleSeat}
            isMaxSeatsReached={selectedSeatIds.size >= MAX_BOOKING_SEATS}
          />

          <BookingSummaryBar
            selectedSeats={selectedSeats}
            ticketPriceInPaise={showtime.priceInPaise}
            onSubmitBooking={handleBookingSubmit}
            isSubmitting={bookingStatus === "loading"}
            isAuthenticated={isAuthenticated}
          />
        </div>
      )}

      {/* Auth Modal if unauthenticated during checkout */}
      <Modal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Sign In to Complete Reservation"
      >
        <AuthForm
          onAuthenticated={() => {
            setShowAuthModal(false);
          }}
          message="Sign in or register to secure your tickets."
        />
      </Modal>

      {/* Booking Confirmation Pass Modal */}
      <Modal
        isOpen={Boolean(confirmedBooking)}
        onClose={() => setConfirmedBooking(null)}
        title="Reservation Confirmed"
      >
        <TicketPass
          booking={confirmedBooking}
          onDismiss={() => setConfirmedBooking(null)}
          onGoToBookings={onGoToBookings}
        />
      </Modal>
    </div>
  );
}
