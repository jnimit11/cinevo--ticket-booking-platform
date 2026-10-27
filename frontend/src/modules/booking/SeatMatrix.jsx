export function SeatItem({
  seat,
  isSelected,
  onToggle,
  disabled,
}) {
  const isBooked = seat.status === "booked";
  const seatLabel = `${seat.rowLabel}${seat.seatNumber}`;

  let seatClass = "seat-button";
  if (isBooked) {
    seatClass += " booked";
  } else if (isSelected) {
    seatClass += " selected";
  } else {
    seatClass += " available";
    if (seat.seatType === "recliner") seatClass += " recliner";
    if (seat.seatType === "premium") seatClass += " premium";
  }

  return (
    <button
      className={seatClass}
      type="button"
      disabled={isBooked || (disabled && !isSelected)}
      onClick={() => onToggle(seat)}
      aria-label={`Seat ${seatLabel}, ${seat.seatType}, ${
        isBooked ? "Booked" : isSelected ? "Selected" : "Available"
      }`}
      aria-pressed={isSelected}
    >
      <span className="seat-label-text">{seat.seatNumber}</span>
    </button>
  );
}

export function SeatMatrix({
  seatsByRow,
  selectedSeatIds,
  onToggleSeat,
  isMaxSeatsReached,
}) {
  return (
    <div className="seat-matrix-wrapper">
      <div className="seat-matrix-scroll-pane">
        <div className="seat-matrix">
          {Array.from(seatsByRow.entries()).map(([rowLabel, rowSeats]) => (
            <div key={rowLabel} className="seat-row">
              <span className="row-letter" aria-hidden="true">
                {rowLabel}
              </span>
              <div className="seat-row-items">
                {rowSeats.map((seat) => (
                  <SeatItem
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeatIds.has(seat.id)}
                    onToggle={onToggleSeat}
                    disabled={isMaxSeatsReached}
                  />
                ))}
              </div>
              <span className="row-letter" aria-hidden="true">
                {rowLabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
