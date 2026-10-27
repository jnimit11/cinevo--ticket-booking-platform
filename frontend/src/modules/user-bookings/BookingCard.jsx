import { formatTicketPrice } from "../../core/utils/currency.js";
import { formatShowtimeDateTime } from "../../core/utils/date.js";

export function BookingCard({ booking, onCancel, isCancelling }) {
  const isConfirmed = booking.status === "confirmed";
  const startsAt = booking.showtime?.startsAt;
  const isPastShow = startsAt && new Date(startsAt) <= new Date();

  return (
    <article className="booking-card">
      <div className="booking-card-top">
        <div className="booking-ref-block">
          <span className="booking-ref-label">RESERVATION REF</span>
          <span className="booking-ref-code">{booking.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <span className={`booking-status-chip ${booking.status}`}>
          {isConfirmed ? (isPastShow ? "Completed" : "Confirmed") : "Cancelled"}
        </span>
      </div>

      <div className="booking-card-main">
        <h3 className="booking-movie-title">{booking.showtime?.movieTitle}</h3>
        <p className="booking-venue">
          {booking.showtime?.cinemaName} &bull; {booking.showtime?.screenName}
        </p>

        <div className="booking-card-details">
          <div className="detail-item">
            <span className="detail-label">SCREENING DATE &amp; TIME</span>
            <span className="detail-val">{formatShowtimeDateTime(startsAt)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">SEATS RESERVED</span>
            <span className="detail-val">
              {booking.seats?.map((s) => `${s.rowLabel}${s.seatNumber}`).join(", ") || "None"}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">TOTAL PAID</span>
            <span className="detail-val">{formatTicketPrice(booking.totalAmountInPaise)}</span>
          </div>
        </div>
      </div>

      {isConfirmed && !isPastShow && onCancel && (
        <div className="booking-card-footer">
          <button
            className="secondary-button cancel-booking-btn"
            type="button"
            disabled={isCancelling}
            onClick={() => onCancel(booking.id)}
          >
            {isCancelling ? "Cancelling..." : "Cancel Reservation"}
          </button>
        </div>
      )}
    </article>
  );
}
