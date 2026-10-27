import { formatTicketPrice } from "../../core/utils/currency.js";
import { MAX_BOOKING_SEATS } from "../../core/config/constants.js";

export function BookingSummaryBar({
  selectedSeats = [],
  ticketPriceInPaise = 0,
  onSubmitBooking,
  isSubmitting = false,
  isAuthenticated = false,
}) {
  const count = selectedSeats.length;
  const totalPrice = count * ticketPriceInPaise;
  const seatLabels = selectedSeats
    .map((s) => `${s.rowLabel}${s.seatNumber}`)
    .join(", ");

  return (
    <div className="booking-summary-bar">
      <div className="summary-left">
        <div className="selected-seats-badge">
          <span className="count-tag">{count}</span>
          <span>of {MAX_BOOKING_SEATS} seats selected</span>
        </div>
        {count > 0 && <span className="seats-list-text">{seatLabels}</span>}
      </div>

      <div className="summary-right">
        <div className="total-price-block">
          <span className="total-label">Total Amount</span>
          <span className="total-amount">{formatTicketPrice(totalPrice)}</span>
        </div>

        <button
          className="primary-button checkout-button"
          type="button"
          disabled={count === 0 || isSubmitting}
          onClick={onSubmitBooking}
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined spin-icon" aria-hidden="true">
                sync
              </span>
              <span>Securing Seats...</span>
            </>
          ) : isAuthenticated ? (
            <>
              <span>Confirm &amp; Book</span>
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </>
          ) : (
            <>
              <span>Sign In to Book</span>
              <span className="material-symbols-outlined" aria-hidden="true">
                login
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function TicketPass({ booking, onDismiss, onGoToBookings }) {
  if (!booking) return null;

  return (
    <div className="ticket-pass-card">
      <div className="ticket-pass-header">
        <span className="ticket-kicker">CINEVO PREMIER PASS</span>
        <span className="ticket-booking-id">REF: {booking.id?.slice(0, 8).toUpperCase()}</span>
      </div>

      <div className="ticket-body">
        <h3 className="ticket-movie-title">{booking.showtime?.movieTitle}</h3>
        <p className="ticket-cinema">
          {booking.showtime?.cinemaName} &bull; {booking.showtime?.screenName}
        </p>

        <div className="ticket-meta-grid">
          <div>
            <span className="meta-label">SEATS</span>
            <span className="meta-val">
              {booking.seats?.map((s) => `${s.rowLabel}${s.seatNumber}`).join(", ")}
            </span>
          </div>
          <div>
            <span className="meta-label">TOTAL PAID</span>
            <span className="meta-val">{formatTicketPrice(booking.totalAmountInPaise)}</span>
          </div>
        </div>
      </div>

      <div className="ticket-actions">
        <button className="primary-button" type="button" onClick={onGoToBookings}>
          View My Bookings
        </button>
        <button className="secondary-button" type="button" onClick={onDismiss}>
          Close
        </button>
      </div>
    </div>
  );
}
