import { formatTicketPrice } from "../../core/utils/currency.js";
import { formatShowtimeDateTime, formatReleaseDate } from "../../core/utils/date.js";

function getSeatLabel(seat) {
  if (!seat) return "";
  return `${seat.rowLabel || ""}${seat.seatNumber || ""}`;
}

export function BookingCard({
  booking,
  onCancel,
  isCancelling,
  isConfirmingCancel,
  onRequestCancel,
  onAbortCancel,
}) {
  const isActive = booking.status === "confirmed";
  const seatLabels = (booking.seats ?? [])
    .map((seat) => (seat.rowLabel && Number.isInteger(seat.seatNumber) ? getSeatLabel(seat) : null))
    .filter(Boolean);

  return (
    <article className={`booking-card ${isActive ? "active" : "cancelled"}`}>
      <div className="booking-card-main">
        <div className="booking-card-heading">
          <div>
            <span className="section-kicker">CINEMA PASS</span>
            <h2>{booking.showtime?.movieTitle || "Movie details unavailable"}</h2>
          </div>
          <span className={isActive ? "booking-status active" : "booking-status cancelled"}>
            <span className="status-dot" aria-hidden="true" />
            <span>{isActive ? "Confirmed Reservation" : "Cancelled"}</span>
          </span>
        </div>

        <p className="booking-id">
          <span className="booking-id-label">Ref ID:</span> <strong>{booking.id}</strong>
        </p>

        <div className="booking-card-details">
          {booking.showtime?.cinemaName && (
            <div className="booking-detail-item">
              <span className="coord-label">VENUE</span>
              <p>
                <strong>{booking.showtime.cinemaName}</strong>
              </p>
            </div>
          )}
          {booking.showtime?.screenName && (
            <div className="booking-detail-item">
              <span className="coord-label">AUDITORIUM</span>
              <p>
                <strong className="crimson">{booking.showtime.screenName}</strong>
              </p>
            </div>
          )}
          {booking.showtime?.startsAt && (
            <div className="booking-detail-item">
              <span className="coord-label">SHOWTIME</span>
              <p>
                <strong>{formatShowtimeDateTime(booking.showtime.startsAt)}</strong>
              </p>
            </div>
          )}
          {seatLabels.length > 0 && (
            <div className="booking-detail-item">
              <span className="coord-label">RESERVED SEATS</span>
              <p>
                <strong className="gold">{seatLabels.join(", ")}</strong>
              </p>
            </div>
          )}
          {Number.isFinite(booking.totalAmountInPaise) && (
            <div className="booking-detail-item">
              <span className="coord-label">TOTAL PAID</span>
              <p>
                <strong className="price-lead">
                  {formatTicketPrice(booking.totalAmountInPaise)}
                </strong>
              </p>
            </div>
          )}
          {booking.createdAt && (
            <div className="booking-detail-item">
              <span className="coord-label">BOOKED ON</span>
              <p>
                <span>{formatReleaseDate(booking.createdAt)}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="booking-card-actions">
        {isActive ? (
          isConfirmingCancel ? (
            <div
              className="cancel-confirmation"
              role="group"
              aria-label="Confirm booking cancellation"
            >
              <span>Cancel this booking? Its seats will be released.</span>
              <button
                className="cancel-confirm-button"
                type="button"
                disabled={isCancelling}
                onClick={() => onCancel(booking.id)}
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
              <button
                className="cancel-keep-button"
                type="button"
                disabled={isCancelling}
                onClick={onAbortCancel}
              >
                Keep Booking
              </button>
            </div>
          ) : (
            <button
              className="cancel-booking-button"
              type="button"
              onClick={() => onRequestCancel(booking.id)}
            >
              Cancel Reservation
            </button>
          )
        ) : (
          <span className="booking-inactive-tag">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "14px" }}
              aria-hidden="true"
            >
              block
            </span>
            <span>Seats Released</span>
          </span>
        )}
      </div>
    </article>
  );
}
