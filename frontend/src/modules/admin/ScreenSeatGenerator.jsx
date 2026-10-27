import { useState, useEffect, useRef } from "react";
import {
  getDashboardCinemas,
  getDashboardMovies,
  createDashboardScreen,
  generateDashboardSeats,
  createDashboardShowtime,
} from "./adminApi.js";

export function parsePriceInPaise(value) {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const [rupees, paise = ""] = normalized.split(".");
  const significantRupees = rupees.replace(/^0+(?=\d)/, "");
  if (significantRupees.length > 15) return null;
  const amount = BigInt(significantRupees) * 100n + BigInt(paise.padEnd(2, "0") || "0");
  return amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null;
}

export function toApiTimestamp(localDateTime) {
  const date = new Date(localDateTime);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function ScreenManagementSection({
  token,
  screensCreatedThisSession,
  setScreensCreatedThisSession,
}) {
  const [cinemas, setCinemas] = useState([]);
  const [cinemaStatus, setCinemaStatus] = useState("loading");
  const [cinemaError, setCinemaError] = useState("");
  const [cinemaLoadAttempt, setCinemaLoadAttempt] = useState(0);

  const [screenForm, setScreenForm] = useState({ cinemaId: "", name: "", totalSeats: "" });
  const [screenErrors, setScreenErrors] = useState({});
  const [screenStatus, setScreenStatus] = useState("idle");
  const [screenError, setScreenError] = useState("");

  const [selectedScreenId, setSelectedScreenId] = useState("");
  const [seatForm, setSeatForm] = useState({ rows: "", seatsPerRow: "", seatType: "regular" });
  const [seatErrors, setSeatErrors] = useState({});
  const [seatStatus, setSeatStatus] = useState("idle");
  const [seatError, setSeatError] = useState("");
  const [seatSuccess, setSeatSuccess] = useState("");
  const [confirmSeatWrite, setConfirmSeatWrite] = useState(false);

  const screenRequestInFlight = useRef(false);
  const seatRequestInFlight = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    getDashboardCinemas({ signal: controller.signal })
      .then((loadedCinemas) => {
        setCinemas(loadedCinemas);
        setCinemaStatus("success");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setCinemaError(error.message || "Unable to load cinemas for the screen form.");
        setCinemaStatus("error");
      });

    return () => controller.abort();
  }, [cinemaLoadAttempt]);

  const selectedScreen = screensCreatedThisSession.find((screen) => screen.id === selectedScreenId);

  function retryCinemaLoad() {
    setCinemaError("");
    setCinemaStatus("loading");
    setCinemaLoadAttempt((attempt) => attempt + 1);
  }

  async function submitScreen(event) {
    event.preventDefault();
    if (screenRequestInFlight.current) return;

    const errors = {};
    const name = screenForm.name.trim();
    const totalSeats = Number(screenForm.totalSeats);
    if (!screenForm.cinemaId || !cinemas.some((cinema) => cinema.id === screenForm.cinemaId)) {
      errors.cinemaId = "Select a cinema from the list.";
    }
    if (!name) errors.name = "Enter a screen name.";
    else if (name.length > 100) errors.name = "Screen name must be 100 characters or fewer.";
    if (!screenForm.totalSeats || !Number.isInteger(totalSeats) || totalSeats <= 0 || totalSeats > 1000) {
      errors.totalSeats = "Total seats must be a positive whole number between 1 and 1,000.";
    }
    setScreenErrors(errors);
    setScreenError("");
    if (Object.keys(errors).length) {
      setScreenStatus("idle");
      return;
    }

    screenRequestInFlight.current = true;
    setScreenStatus("loading");
    try {
      const screen = await createDashboardScreen(
        {
          cinemaId: screenForm.cinemaId,
          name,
          totalSeats,
        },
        token,
      );
      const createdScreen = {
        ...screen,
        totalSeats,
        cinemaId: screenForm.cinemaId,
        cinemaName: cinemas.find((cinema) => cinema.id === screenForm.cinemaId)?.name || "",
      };
      setScreensCreatedThisSession((current) => [
        createdScreen,
        ...current.filter((item) => item.id !== createdScreen.id),
      ]);
      setSelectedScreenId(createdScreen.id);
      setScreenForm({ cinemaId: screenForm.cinemaId, name: "", totalSeats: "" });
      setScreenStatus("success");
      setSeatForm({ rows: "", seatsPerRow: "", seatType: "regular" });
      setSeatErrors({});
      setSeatError("");
      setSeatSuccess("");
      setConfirmSeatWrite(false);
    } catch (error) {
      setScreenError(error.message || "Unable to create the screen.");
      setScreenStatus("error");
    } finally {
      screenRequestInFlight.current = false;
    }
  }

  async function submitSeatGeneration(event) {
    event.preventDefault();
    if (seatRequestInFlight.current || !selectedScreen || selectedScreen.seatsGenerated) return;

    const rows = Number(seatForm.rows);
    const seatsPerRow = Number(seatForm.seatsPerRow);
    const errors = {};
    if (!Number.isInteger(rows) || rows < 1 || rows > 10) {
      errors.rows = "Rows must be a whole number from 1 to 10.";
    }
    if (!Number.isInteger(seatsPerRow) || seatsPerRow < 1 || seatsPerRow > 12) {
      errors.seatsPerRow = "Seats per row must be a whole number from 1 to 12.";
    }
    if (
      Number.isInteger(rows) &&
      Number.isInteger(seatsPerRow) &&
      rows >= 1 &&
      rows <= 10 &&
      seatsPerRow >= 1 &&
      seatsPerRow <= 12 &&
      rows * seatsPerRow > selectedScreen.totalSeats
    ) {
      errors.layout = `This layout exceeds the screen capacity of ${selectedScreen.totalSeats} seats.`;
    }
    if (!confirmSeatWrite) errors.confirmation = "Confirm that you want to write these seat records.";
    setSeatErrors(errors);
    setSeatError("");
    setSeatSuccess("");
    if (Object.keys(errors).length) {
      setSeatStatus("idle");
      return;
    }

    seatRequestInFlight.current = true;
    setSeatStatus("loading");
    try {
      const result = await generateDashboardSeats(
        selectedScreen.id,
        {
          rows,
          seatsPerRow,
          seatType: seatForm.seatType,
        },
        token,
      );
      setSeatSuccess(`${result.totalSeats} seat records generated for ${selectedScreen.name}.`);
      setSeatStatus("success");
      setScreensCreatedThisSession((current) =>
        current.map((screen) =>
          screen.id === selectedScreen.id ? { ...screen, seatsGenerated: true } : screen,
        ),
      );
    } catch (error) {
      setSeatError(error.message || "Unable to generate seats.");
      setSeatStatus("error");
    } finally {
      seatRequestInFlight.current = false;
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <span className="section-kicker">CATALOG</span>
          <div className="admin-title-row">
            <span className="material-symbols-outlined admin-title-icon crimson" aria-hidden="true">
              tv
            </span>
            <h2>Screens</h2>
          </div>
          <p>Create screens and generate their seat layout.</p>
        </div>
      </div>
      <p className="admin-capability">
        No screen-list endpoint exists. Screens below are only those created during this dashboard
        session and are not restored after reload.
      </p>

      {/* Screen Creation Form */}
      <form className="admin-movie-form" noValidate onSubmit={submitScreen}>
        <h3>Create Screen</h3>
        <div className="admin-form-grid">
          <label className="admin-form-field admin-form-wide">
            <span>Cinema <span aria-hidden="true">*</span></span>
            <select
              name="cinemaId"
              value={screenForm.cinemaId}
              onChange={(event) => {
                setScreenForm((current) => ({ ...current, cinemaId: event.target.value }));
                setScreenErrors((current) => ({ ...current, cinemaId: "" }));
                setScreenError("");
              }}
              disabled={cinemaStatus !== "success" || screenStatus === "loading"}
              required
              aria-invalid={Boolean(screenErrors.cinemaId)}
            >
              <option value="">Select a cinema</option>
              {cinemas.map((cinema) => (
                <option key={cinema.id} value={cinema.id}>
                  {cinema.name} — {cinema.city}
                </option>
              ))}
            </select>
            {cinemaStatus === "loading" && <small>Loading cinemas…</small>}
            {cinemaStatus === "error" && (
              <small className="admin-field-error" role="alert">
                {cinemaError}{" "}
                <button className="admin-inline-retry" type="button" onClick={retryCinemaLoad}>
                  Retry
                </button>
              </small>
            )}
            {cinemaStatus === "success" && cinemas.length === 0 && (
              <small>No cinemas are available. Add a cinema before creating a screen.</small>
            )}
            {screenErrors.cinemaId && <small className="admin-field-error">{screenErrors.cinemaId}</small>}
          </label>
          <label className="admin-form-field">
            <span>Screen name <span aria-hidden="true">*</span></span>
            <input
              name="name"
              value={screenForm.name}
              onChange={(event) => {
                setScreenForm((current) => ({ ...current, name: event.target.value }));
                setScreenErrors((current) => ({ ...current, name: "" }));
                setScreenError("");
              }}
              maxLength={100}
              required
              aria-invalid={Boolean(screenErrors.name)}
            />
            {screenErrors.name && <small className="admin-field-error">{screenErrors.name}</small>}
          </label>
          <label className="admin-form-field">
            <span>Total seats <span aria-hidden="true">*</span></span>
            <input
              name="totalSeats"
              type="number"
              min="1"
              max="1000"
              step="1"
              value={screenForm.totalSeats}
              onChange={(event) => {
                setScreenForm((current) => ({ ...current, totalSeats: event.target.value }));
                setScreenErrors((current) => ({ ...current, totalSeats: "" }));
                setScreenError("");
              }}
              required
              aria-invalid={Boolean(screenErrors.totalSeats)}
            />
            {screenErrors.totalSeats && (
              <small className="admin-field-error">{screenErrors.totalSeats}</small>
            )}
          </label>
        </div>
        {screenError && <p className="admin-form-error" role="alert">{screenError}</p>}
        {screenStatus === "success" && (
          <p className="admin-form-success" role="status">
            Screen created. It is available for seat generation until this dashboard session ends.
          </p>
        )}
        <button
          className="primary-button admin-submit-button"
          type="submit"
          disabled={screenStatus === "loading" || cinemaStatus !== "success" || cinemas.length === 0}
        >
          {screenStatus === "loading" ? "Creating screen..." : "Create Screen"}
        </button>
      </form>

      {/* Screens Created List */}
      {screensCreatedThisSession.length > 0 && (
        <ul className="admin-item-list admin-created-screens">
          {screensCreatedThisSession.map((screen) => {
            const cinema = cinemas.find((item) => item.id === screen.cinemaId);
            return (
              <li className="admin-item" key={screen.id}>
                <strong>{screen.name}</strong>
                <span>{cinema?.name || "Cinema"} · Capacity {screen.totalSeats}</span>
                {screen.seatsGenerated && <span>Seats generated</span>}
              </li>
            );
          })}
        </ul>
      )}

      {/* Seat Generation Form */}
      <form className="admin-movie-form" noValidate onSubmit={submitSeatGeneration}>
        <h3>Generate Seats</h3>
        <p className="admin-form-intro">
          Seat generation writes seat records to the database and cannot be undone from this dashboard.
        </p>
        <div className="admin-form-grid">
          <label className="admin-form-field admin-form-wide">
            <span>Screen <span aria-hidden="true">*</span></span>
            <select
              value={selectedScreenId}
              onChange={(event) => {
                setSelectedScreenId(event.target.value);
                setSeatError("");
                setSeatSuccess("");
                setSeatErrors({});
                setConfirmSeatWrite(false);
              }}
            >
              <option value="">Select a screen created this session</option>
              {screensCreatedThisSession.map((screen) => (
                <option key={screen.id} value={screen.id} disabled={screen.seatsGenerated}>
                  {screen.name} ({screen.totalSeats} seats)
                  {screen.seatsGenerated ? " — seats generated" : ""}
                </option>
              ))}
            </select>
            {!screensCreatedThisSession.length && (
              <small>Create a screen above to make it available here.</small>
            )}
            {selectedScreen?.seatsGenerated && (
              <small>Seats have already been generated for this screen.</small>
            )}
          </label>
          <label className="admin-form-field">
            <span>Rows (1–10) <span aria-hidden="true">*</span></span>
            <input
              type="number"
              min="1"
              max="10"
              step="1"
              value={seatForm.rows}
              onChange={(event) => {
                setSeatForm((current) => ({ ...current, rows: event.target.value }));
                setSeatErrors((current) => ({ ...current, rows: "", layout: "" }));
                setSeatError("");
              }}
              aria-invalid={Boolean(seatErrors.rows || seatErrors.layout)}
              disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === "loading"}
            />
            {seatErrors.rows && <small className="admin-field-error">{seatErrors.rows}</small>}
          </label>
          <label className="admin-form-field">
            <span>Seats per row (1–12) <span aria-hidden="true">*</span></span>
            <input
              type="number"
              min="1"
              max="12"
              step="1"
              value={seatForm.seatsPerRow}
              onChange={(event) => {
                setSeatForm((current) => ({ ...current, seatsPerRow: event.target.value }));
                setSeatErrors((current) => ({ ...current, seatsPerRow: "", layout: "" }));
                setSeatError("");
              }}
              aria-invalid={Boolean(seatErrors.seatsPerRow || seatErrors.layout)}
              disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === "loading"}
            />
            {seatErrors.seatsPerRow && (
              <small className="admin-field-error">{seatErrors.seatsPerRow}</small>
            )}
          </label>
          <label className="admin-form-field">
            <span>Seat type</span>
            <select
              value={seatForm.seatType}
              onChange={(event) =>
                setSeatForm((current) => ({ ...current, seatType: event.target.value }))
              }
              disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === "loading"}
            >
              <option value="regular">Regular</option>
              <option value="premium">Premium</option>
              <option value="recliner">Recliner</option>
            </select>
          </label>
        </div>
        {seatErrors.layout && <p className="admin-field-error">{seatErrors.layout}</p>}
        <label className="admin-confirm-field">
          <input
            type="checkbox"
            checked={confirmSeatWrite}
            onChange={(event) => {
              setConfirmSeatWrite(event.target.checked);
              setSeatErrors((current) => ({ ...current, confirmation: "" }));
            }}
            disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === "loading"}
          />
          I understand this will create seat records for the selected screen.
        </label>
        {seatErrors.confirmation && (
          <p className="admin-field-error">{seatErrors.confirmation}</p>
        )}
        {seatError && <p className="admin-form-error" role="alert">{seatError}</p>}
        {seatSuccess && <p className="admin-form-success" role="status">{seatSuccess}</p>}
        <button
          className="primary-button admin-submit-button"
          type="submit"
          disabled={!selectedScreen || selectedScreen.seatsGenerated || seatStatus === "loading"}
        >
          {seatStatus === "loading" ? "Generating seats..." : "Generate Seats"}
        </button>
      </form>
    </section>
  );
}

export function ShowtimeForm({ token, screens = [], onCreated }) {
  const [movies, setMovies] = useState([]);
  const [movieStatus, setMovieStatus] = useState("loading");
  const [movieError, setMovieError] = useState("");
  const [movieLoadAttempt, setMovieLoadAttempt] = useState(0);

  const [form, setForm] = useState({
    movieId: "",
    screenId: "",
    startsAt: "",
    endsAt: "",
    priceInRupees: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const submissionInFlight = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    getDashboardMovies({ signal: controller.signal })
      .then((loadedMovies) => {
        setMovies(loadedMovies);
        setMovieStatus("success");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setMovieError(error.message || "Unable to load movies for the showtime form.");
        setMovieStatus("error");
      });

    return () => controller.abort();
  }, [movieLoadAttempt]);

  const selectedMovie = movies.find((movie) => movie.id === form.movieId);
  const selectedScreen = screens.find((screen) => screen.id === form.screenId);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setApiError("");
    setSuccessMessage("");
    setStatus((current) => (current === "error" || current === "success" ? "idle" : current));
  }

  async function submitShowtime(event) {
    event.preventDefault();
    if (submissionInFlight.current) return;

    const validationErrors = {};
    if (!selectedMovie) validationErrors.movieId = "Select a movie from the catalog.";
    if (!selectedScreen) validationErrors.screenId = "Select a screen created during this dashboard session.";

    const startsAtDate = new Date(form.startsAt);
    const endsAtDate = new Date(form.endsAt);
    const startsAt = toApiTimestamp(form.startsAt);
    const endsAt = toApiTimestamp(form.endsAt);
    if (!form.startsAt || !startsAt || Number.isNaN(startsAtDate.getTime())) {
      validationErrors.startsAt = "Enter a valid start date and time.";
    }
    if (!form.endsAt || !endsAt || Number.isNaN(endsAtDate.getTime())) {
      validationErrors.endsAt = "Enter a valid end date and time.";
    } else if (startsAt && endsAtDate <= startsAtDate) {
      validationErrors.endsAt = "End time must be after start time.";
    } else if (selectedMovie && startsAt && endsAtDate - startsAtDate < selectedMovie.durationMinutes * 60_000) {
      validationErrors.endsAt = `End time must allow at least ${selectedMovie.durationMinutes} minutes for this movie.`;
    }

    const priceInPaise = parsePriceInPaise(form.priceInRupees);
    if (priceInPaise === null) {
      validationErrors.priceInRupees = "Enter a non-negative amount with no more than two decimal places.";
    } else if (priceInPaise > 10_000_000) {
      validationErrors.priceInRupees = "Ticket price cannot exceed ₹100,000 (10,000,000 paise).";
    }

    setErrors(validationErrors);
    setApiError("");
    setSuccessMessage("");
    if (Object.keys(validationErrors).length) {
      setStatus("idle");
      return;
    }

    submissionInFlight.current = true;
    setStatus("loading");
    try {
      const created = await createDashboardShowtime(
        {
          movieId: selectedMovie.id,
          screenId: selectedScreen.id,
          startsAt,
          endsAt,
          priceInPaise,
        },
        token,
      );
      const enrichedShowtime = {
        ...created,
        movieTitle: selectedMovie.title,
        durationMinutes: selectedMovie.durationMinutes,
        screenName: selectedScreen.name,
        cinemaName: selectedScreen.cinemaName || "",
      };
      onCreated?.(enrichedShowtime);
      setSuccessMessage(`Showtime for “${selectedMovie.title}” was created. Refreshing the list…`);
      setForm({ movieId: "", screenId: "", startsAt: "", endsAt: "", priceInRupees: "" });
      setStatus("success");
    } catch (error) {
      setApiError(error.message || "Unable to create the showtime.");
      setStatus("error");
    } finally {
      submissionInFlight.current = false;
    }
  }

  function retryMovieLoad() {
    setMovieError("");
    setMovieStatus("loading");
    setMovieLoadAttempt((attempt) => attempt + 1);
  }

  return (
    <form className="admin-movie-form" noValidate onSubmit={submitShowtime}>
      <h3>Create Showtime</h3>
      <p className="admin-form-intro">
        Choose a catalog movie and a screen created during this dashboard session. Screen options are not restored after reload.
      </p>
      <div className="admin-form-grid">
        <label className="admin-form-field admin-form-wide">
          <span>Movie <span aria-hidden="true">*</span></span>
          <select
            name="movieId"
            value={form.movieId}
            onChange={updateField}
            disabled={movieStatus !== "success" || status === "loading"}
            aria-invalid={Boolean(errors.movieId)}
          >
            <option value="">Select a movie</option>
            {movies.map((movie) => (
              <option key={movie.id} value={movie.id}>
                {movie.title}
              </option>
            ))}
          </select>
          {movieStatus === "loading" && <small>Loading movies…</small>}
          {movieStatus === "error" && (
            <small className="admin-field-error" role="alert">
              {movieError}{" "}
              <button className="admin-inline-retry" type="button" onClick={retryMovieLoad}>
                Retry
              </button>
            </small>
          )}
          {movieStatus === "success" && movies.length === 0 && (
            <small>No movies are available. Add a movie before scheduling a showtime.</small>
          )}
          {errors.movieId && <small className="admin-field-error">{errors.movieId}</small>}
        </label>
        <label className="admin-form-field admin-form-wide">
          <span>Screen <span aria-hidden="true">*</span></span>
          <select
            name="screenId"
            value={form.screenId}
            onChange={updateField}
            disabled={!screens.length || status === "loading"}
            aria-invalid={Boolean(errors.screenId)}
          >
            <option value="">Select a screen created this session</option>
            {screens.map((screen) => (
              <option key={screen.id} value={screen.id}>
                {screen.name} — {screen.cinemaName || "Cinema"}
              </option>
            ))}
          </select>
          {!screens.length && (
            <small>
              No eligible screen is available. Create a screen in this dashboard session; screen options are lost after reload.
            </small>
          )}
          {errors.screenId && <small className="admin-field-error">{errors.screenId}</small>}
        </label>
        <label className="admin-form-field">
          <span>Start date and time <span aria-hidden="true">*</span></span>
          <input
            type="datetime-local"
            name="startsAt"
            value={form.startsAt}
            onChange={updateField}
            disabled={status === "loading"}
            aria-invalid={Boolean(errors.startsAt)}
          />
          <small>Entered in your local timezone; sent to the API as an ISO 8601 timestamp.</small>
          {errors.startsAt && <small className="admin-field-error">{errors.startsAt}</small>}
        </label>
        <label className="admin-form-field">
          <span>End date and time <span aria-hidden="true">*</span></span>
          <input
            type="datetime-local"
            name="endsAt"
            value={form.endsAt}
            onChange={updateField}
            disabled={status === "loading"}
            aria-invalid={Boolean(errors.endsAt)}
          />
          {errors.endsAt && <small className="admin-field-error">{errors.endsAt}</small>}
        </label>
        <label className="admin-form-field">
          <span>Ticket price (INR) <span aria-hidden="true">*</span></span>
          <input
            type="text"
            inputMode="decimal"
            name="priceInRupees"
            value={form.priceInRupees}
            onChange={updateField}
            placeholder="e.g. 250.00"
            disabled={status === "loading"}
            aria-invalid={Boolean(errors.priceInRupees)}
          />
          {errors.priceInRupees && <small className="admin-field-error">{errors.priceInRupees}</small>}
        </label>
      </div>
      {apiError && <p className="admin-form-error" role="alert">{apiError}</p>}
      {successMessage && <p className="admin-form-success" role="status">{successMessage}</p>}
      <button
        className="primary-button admin-submit-button"
        type="submit"
        disabled={status === "loading" || movieStatus !== "success" || movies.length === 0 || screens.length === 0}
      >
        {status === "loading" ? "Creating showtime..." : "Create Showtime"}
      </button>
    </form>
  );
}

// Aliases for backwards compatibility
export const ScreenSeatGenerator = ScreenManagementSection;
export const ShowtimeScheduler = ShowtimeForm;
