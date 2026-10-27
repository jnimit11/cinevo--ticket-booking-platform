import { ShowtimePill } from "./ShowtimePill.jsx";

export function CinemaShowtimeGroup({ cinemaName, screenGroups, onSelectShowtime }) {
  return (
    <div className="cinema-showtime-card">
      <div className="cinema-card-header">
        <span className="material-symbols-outlined cinema-icon" aria-hidden="true">
          theaters
        </span>
        <div>
          <h3 className="cinema-title">{cinemaName}</h3>
          <span className="cinema-subtitle">Luxury Recliner Seating &bull; In-Seat Dining</span>
        </div>
      </div>

      <div className="screens-container">
        {Object.entries(screenGroups).map(([screenName, showtimes]) => (
          <div key={screenName} className="screen-row">
            <span className="screen-badge">{screenName}</span>
            <div className="showtime-pills-list">
              {showtimes.map((st) => (
                <ShowtimePill
                  key={st.id}
                  showtime={st}
                  onSelect={onSelectShowtime}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
