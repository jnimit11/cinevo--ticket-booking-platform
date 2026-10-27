import { useState, useEffect, useCallback } from "react";
import { getMyBookings, cancelExistingBooking } from "./userBookingsApi.js";
import { BookingCard } from "./BookingCard.jsx";
import { AuthForm } from "../auth/AuthForm.jsx";
import { useAuth } from "../auth/index.js";

export function MyBookingsView({ onBack, onBrowseMovies }) {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [cancelNotice, setCancelNotice] = useState("");
  const [cancelError, setCancelError] = useState("");

  const { token, isAuthenticated } = useAuth();

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
    setCancellingId(bookingId);
    setCancelError("");

    try {
      await cancelExistingBooking(bookingId, token);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b)),
      );
      setConfirmCancelId(null);
      setCancelNotice("Booking was cancelled successfully. Seats have been released.");
    } catch (err) {
      setCancelError(err.message || "Could not cancel booking.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="bookings-page">
      <button className="secondary-button back-button" onClick={onBack} type="button">
        <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">
          arrow_back
        </span>
        <span>Back to Movies</span>
      </button>

      <div className="bookings-page-heading">
        <span className="section-kicker">YOUR CINEVO ACCOUNT</span>
        <h1>My Bookings</h1>
        <p>Your luxury cinema reservation history and active digital passes.</p>
      </div>

      {!isAuthenticated ? (
        <div className="bookings-auth">
          <div className="empty-state">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "36px", color: "#ffb3b6" }}
              aria-hidden="true"
            >
              lock
            </span>
            <h2>Sign in to view your bookings</h2>
            <p>Your booking history and digital passes are private to your account.</p>
          </div>
          <AuthForm initialMode="signin" onSuccess={loadBookings} />
        </div>
      ) : status === "loading" ? (
        <div className="empty-state" role="status">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "36px", color: "#ffb3b6", animation: "spin 1.5s linear infinite" }}
            aria-hidden="true"
          >
            sync
          </span>
          <h3>Loading your bookings...</h3>
          <p>Fetching your luxury screening reservations.</p>
        </div>
      ) : status === "error" ? (
        <div className="empty-state" role="alert">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "36px", color: "#ffb4ab" }}
            aria-hidden="true"
          >
            cloud_off
          </span>
          <h3>We couldn’t load your bookings</h3>
          <p>{errorMessage}</p>
          <button className="secondary-button" onClick={loadBookings} type="button">
            Try again
          </button>
        </div>
      ) : (
        <>
          {cancelNotice && (
            <div className="booking-notice" role="status">
              {cancelNotice}
            </div>
          )}
          {cancelError && (
            <div className="notice booking-error" role="alert">
              {cancelError}
            </div>
          )}
          {bookings.length === 0 ? (
            <div className="empty-state">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "40px", color: "#554f5c" }}
                aria-hidden="true"
              >
                theater_comedy
              </span>
              <h3>No bookings yet</h3>
              <p>When you reserve a screening, your luxury digital passes will appear here.</p>
              <button
                className="primary-button"
                type="button"
                style={{ marginTop: "16px" }}
                onClick={onBrowseMovies || (() => { window.location.hash = "#movies"; })}
              >
                <span>Explore Movies</span>
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </div>
          ) : (
            <div className="booking-list">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onCancel={handleCancelBooking}
                  isCancelling={cancellingId === booking.id}
                  isConfirmingCancel={confirmCancelId === booking.id}
                  onRequestCancel={(id) => {
                    setCancelError("");
                    setCancelNotice("");
                    setConfirmCancelId(id);
                  }}
                  onAbortCancel={() => setConfirmCancelId(null)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
