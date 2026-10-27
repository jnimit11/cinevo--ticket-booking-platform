export function ScreenBanner() {
  return (
    <div className="screen-indicator-container" aria-hidden="true">
      <div className="screen-curve" />
      <span className="screen-label">ALL EYES THIS WAY &bull; SCREEN</span>
    </div>
  );
}

export function SeatLegend() {
  return (
    <div className="seat-legend" aria-label="Seat status key">
      <div className="legend-item">
        <span className="seat-chip seat-available" aria-hidden="true" />
        <span>Available</span>
      </div>
      <div className="legend-item">
        <span className="seat-chip seat-selected" aria-hidden="true" />
        <span>Selected</span>
      </div>
      <div className="legend-item">
        <span className="seat-chip seat-booked" aria-hidden="true" />
        <span>Booked</span>
      </div>
      <div className="legend-item">
        <span className="seat-chip seat-recliner-chip" aria-hidden="true" />
        <span>VIP Recliner</span>
      </div>
    </div>
  );
}
