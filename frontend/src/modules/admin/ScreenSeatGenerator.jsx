import { useState } from "react";
import {
  createDashboardScreen,
  generateDashboardSeats,
  createDashboardShowtime,
} from "./adminApi.js";

export function ScreenSeatGenerator({ cinemas, token, onCreated }) {
  const [cinemaId, setCinemaId] = useState(cinemas[0]?.id || "");
  const [screenName, setScreenName] = useState("Screen 1 — Dolby Atmos");
  const [totalSeats, setTotalSeats] = useState(120);
  const [rows, setRows] = useState(10);
  const [seatsPerRow, setSeatsPerRow] = useState(12);
  const [seatType, setSeatType] = useState("regular");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!cinemaId) {
      setError("Please select a cinema venue first.");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      // 1. Create the screen
      const screen = await createDashboardScreen(
        { cinemaId, name: screenName.trim(), totalSeats: Number(totalSeats) },
        token,
      );

      // 2. Generate seat layout
      await generateDashboardSeats(
        screen.id,
        {
          rows: Number(rows),
          seatsPerRow: Number(seatsPerRow),
          seatType,
        },
        token,
      );

      setStatus("idle");
      onCreated?.();
    } catch (err) {
      setError(err.message || "Screen or seat creation failed.");
      setStatus("error");
    }
  };

  return (
    <form className="admin-form" onSubmit={handleCreate}>
      <label className="admin-field">
        <span>Select Venue *</span>
        <select value={cinemaId} onChange={(e) => setCinemaId(e.target.value)} required>
          <option value="">-- Choose Cinema --</option>
          {cinemas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.city})
            </option>
          ))}
        </select>
      </label>

      <div className="admin-form-row">
        <label className="admin-field">
          <span>Screen Name *</span>
          <input
            type="text"
            required
            value={screenName}
            onChange={(e) => setScreenName(e.target.value)}
          />
        </label>

        <label className="admin-field">
          <span>Max Screen Capacity *</span>
          <input
            type="number"
            required
            min={1}
            max={1000}
            value={totalSeats}
            onChange={(e) => setTotalSeats(e.target.value)}
          />
        </label>
      </div>

      <div className="admin-form-row">
        <label className="admin-field">
          <span>Rows (A-Z)</span>
          <input
            type="number"
            min={1}
            max={10}
            value={rows}
            onChange={(e) => setRows(e.target.value)}
          />
        </label>

        <label className="admin-field">
          <span>Seats Per Row</span>
          <input
            type="number"
            min={1}
            max={12}
            value={seatsPerRow}
            onChange={(e) => setSeatsPerRow(e.target.value)}
          />
        </label>

        <label className="admin-field">
          <span>Default Seat Tier</span>
          <select value={seatType} onChange={(e) => setSeatType(e.target.value)}>
            <option value="regular">Regular</option>
            <option value="premium">Premium</option>
            <option value="recliner">VIP Recliner</option>
          </select>
        </label>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <button className="primary-button" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Constructing Screen & Grid..." : "Build Screen & Grid"}
      </button>
    </form>
  );
}

export function ShowtimeScheduler({ movies, screens, token, onCreated }) {
  const [movieId, setMovieId] = useState(movies[0]?.id || "");
  const [screenId, setScreenId] = useState(screens[0]?.id || "");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [priceInRupees, setPriceInRupees] = useState(400);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!movieId || !screenId) {
      setError("Please select both a movie and a screen.");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const payload = {
        movieId,
        screenId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        priceInPaise: Math.round(Number(priceInRupees) * 100),
      };

      await createDashboardShowtime(payload, token);
      setStatus("idle");
      onCreated?.();
    } catch (err) {
      setError(err.message || "Failed to schedule showtime.");
      setStatus("error");
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSchedule}>
      <div className="admin-form-row">
        <label className="admin-field">
          <span>Select Movie *</span>
          <select value={movieId} onChange={(e) => setMovieId(e.target.value)} required>
            <option value="">-- Choose Movie --</option>
            {movies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.durationMinutes}m)
              </option>
            ))}
          </select>
        </label>

        <label className="admin-field">
          <span>Select Screen *</span>
          <select value={screenId} onChange={(e) => setScreenId(e.target.value)} required>
            <option value="">-- Choose Screen --</option>
            {screens.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.cinemaName || "Venue"})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-form-row">
        <label className="admin-field">
          <span>Screening Start Date &amp; Time *</span>
          <input
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>

        <label className="admin-field">
          <span>Screening End Date &amp; Time *</span>
          <input
            type="datetime-local"
            required
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </label>
      </div>

      <label className="admin-field">
        <span>Ticket Price in INR (₹) *</span>
        <input
          type="number"
          required
          min={50}
          max={10000}
          value={priceInRupees}
          onChange={(e) => setPriceInRupees(e.target.value)}
        />
      </label>

      {error && <p className="auth-error">{error}</p>}

      <button className="primary-button" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Scheduling Screening..." : "Schedule Showtime"}
      </button>
    </form>
  );
}
