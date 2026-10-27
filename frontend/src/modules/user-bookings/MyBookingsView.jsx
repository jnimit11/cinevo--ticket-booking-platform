import { useState, useEffect, useCallback } from "react";
import { getMyBookings, cancelExistingBooking } from "./userBookingsApi.js";
import { BookingCard } from "./BookingCard.jsx";
import { Spinner } from "../../shared/components/Spinner/Spinner.jsx";
import { EmptyState } from "../../shared/components/EmptyState/EmptyState.jsx";
import { useAuth } from "../auth/index.js";

export function MyBookingsView({ onBack, onBrowseMovies }) {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const { token } = useAuth();

  const loadBookings = useCallback(async () => {
    if (!token) return;
    setStatus("loading");
    setErrorMessage("");

    try {
      const data = await getMyBookings(token);
      setBookings(data);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err.message || "Failed to load bookings.");
      setStatus("error");
    }
  }, [token]);

  useEffect(() => {
    let ignore = false;
    if (!token) return;

    getMyBookings(token)
      .then((data) => {
        if (!ignore) {
          setBookings(data);
          setStatus("success");
        }
      })
      .catch((err) => {
        if (!ignore) {
          setErrorMessage(err.message || "Failed to load bookings.");
          setStatus("error");
        }
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you wish to cancel this reservation? Released seats will become available immediately.")) {
      return;
    }

    setCancellingId(bookingId);

    try {
      await cancelExistingBooking(bookingId, token);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b)),
      );
    } catch (err) {
      alert(err.message || "Could not cancel booking.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="bookings-page">
      <div className="bookings-header">
        <button className="secondary-button back-button" type="button" onClick={onBack}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">
            arrow_back
          </span>
          <span>Back to Movies</span>
        </button>

        <div>
          <span className="section-kicker">CONCIERGE DESK</span>
          <h1 className="page-title">My Screening Reservations</h1>
          <p className="page-description">
            Manage your scheduled cinema passes, digital tickets, and reservations.
          </p>
        </div>
      </div>

      {status === "loading" && (
        <div className="status-panel">
          <Spinner message="Retrieving your reservation history..." />
        </div>
      )}

      {status === "error" && (
        <div className="status-panel error-panel" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">
            error
          </span>
          <p>{errorMessage}</p>
          <button className="primary-button" type="button" onClick={loadBookings}>
            Try Again
          </button>
        </div>
      )}

      {status === "success" && bookings.length === 0 && (
        <EmptyState
          icon="confirmation_number"
          title="No reservations yet"
          description="You haven't booked any screenings yet. Explore our current catalogue and reserve your premier seats."
          actionLabel="Browse Movies"
          onAction={onBrowseMovies}
        />
      )}

      {status === "success" && bookings.length > 0 && (
        <div className="bookings-grid">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onCancel={handleCancelBooking}
              isCancelling={cancellingId === booking.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
