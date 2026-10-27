export function getSeatLabel(seat) {
  if (!seat) return "";
  return `${seat.rowLabel}${seat.seatNumber}`;
}
