import { formatShowtimeTime } from "../../core/utils/date.js";
import { formatTicketPrice } from "../../core/utils/currency.js";

export function ShowtimePill({ showtime, onSelect }) {
  const timeFormatted = formatShowtimeTime(showtime.startsAt);
  const priceFormatted = formatTicketPrice(showtime.priceInPaise);

  return (
    <button
      className="showtime-pill"
      type="button"
      onClick={() => onSelect(showtime)}
    >
      <span className="showtime-time">{timeFormatted}</span>
      <span className="showtime-format">Dolby Atmos</span>
      <span className="showtime-price">{priceFormatted}</span>
    </button>
  );
}
