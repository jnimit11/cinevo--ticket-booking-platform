import { useState, useRef } from "react";
import { createDashboardMovie, createDashboardCinema } from "./adminApi.js";

export function validateMovieForm(form) {
  const errors = {};
  const title = form.title.trim();
  const language = form.language.trim();
  const duration = Number(form.durationMinutes);

  if (!title) errors.title = "Enter a movie title.";
  else if (title.length > 200) errors.title = "Title must be 200 characters or fewer.";

  if (!form.durationMinutes || !Number.isInteger(duration) || duration <= 0 || duration > 1000) {
    errors.durationMinutes = "Duration must be a positive whole number between 1 and 1,000 minutes.";
  }

  if (!language) errors.language = "Enter the movie language.";
  else if (language.length > 50) errors.language = "Language must be 50 characters or fewer.";

  if (form.releaseDate) {
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(form.releaseDate);
    const date = dateMatch ? new Date(`${form.releaseDate}T00:00:00.000Z`) : null;
    if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== form.releaseDate) {
      errors.releaseDate = "Enter a valid release date.";
    }
  }

  if (form.posterUrl.trim()) {
    try {
      new URL(form.posterUrl.trim());
    } catch {
      errors.posterUrl = "Enter a valid poster URL.";
    }
  }

  return errors;
}

export function AddMovieForm({ token, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    durationMinutes: "",
    language: "",
    description: "",
    releaseDate: "",
    posterUrl: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [apiError, setApiError] = useState("");
  const [createdTitle, setCreatedTitle] = useState("");
  const submissionInFlight = useRef(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setApiError("");
    setStatus((current) => (current === "error" ? "idle" : current));
  }

  async function submitMovie(event) {
    event.preventDefault();
    if (submissionInFlight.current) return;

    const validationErrors = validateMovieForm(form);
    setErrors(validationErrors);
    setApiError("");
    setCreatedTitle("");

    if (Object.keys(validationErrors).length) {
      setStatus("idle");
      return;
    }

    setStatus("loading");

    const payload = {
      title: form.title.trim(),
      durationMinutes: Number(form.durationMinutes),
      language: form.language.trim(),
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.releaseDate) payload.releaseDate = form.releaseDate;
    if (form.posterUrl.trim()) payload.posterUrl = form.posterUrl.trim();

    submissionInFlight.current = true;
    try {
      const createdMovie = await createDashboardMovie(payload, token);
      onCreated?.(createdMovie);
      setCreatedTitle(createdMovie.title);
      setForm({
        title: "",
        durationMinutes: "",
        language: "",
        description: "",
        releaseDate: "",
        posterUrl: "",
      });
      setStatus("success");
    } catch (error) {
      setApiError(error.message || "Unable to create the movie.");
      setStatus("error");
    } finally {
      submissionInFlight.current = false;
    }
  }

  return (
    <form className="admin-movie-form" noValidate onSubmit={submitMovie}>
      <h3>Add Movie</h3>
      <p className="admin-form-intro">Add a movie to the catalog. Fields marked required must be completed.</p>
      <div className="admin-form-grid">
        <label className="admin-form-field">
          <span>Title <span aria-hidden="true">*</span></span>
          <input
            name="title"
            value={form.title}
            onChange={updateField}
            maxLength={200}
            required
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "admin-movie-title-error" : undefined}
          />
          {errors.title && <small id="admin-movie-title-error" className="admin-field-error">{errors.title}</small>}
        </label>
        <label className="admin-form-field">
          <span>Duration (minutes) <span aria-hidden="true">*</span></span>
          <input
            name="durationMinutes"
            type="number"
            min="1"
            max="1000"
            step="1"
            value={form.durationMinutes}
            onChange={updateField}
            required
            aria-invalid={Boolean(errors.durationMinutes)}
            aria-describedby={errors.durationMinutes ? "admin-movie-duration-error" : undefined}
          />
          {errors.durationMinutes && <small id="admin-movie-duration-error" className="admin-field-error">{errors.durationMinutes}</small>}
        </label>
        <label className="admin-form-field">
          <span>Language <span aria-hidden="true">*</span></span>
          <input
            name="language"
            value={form.language}
            onChange={updateField}
            maxLength={50}
            required
            aria-invalid={Boolean(errors.language)}
            aria-describedby={errors.language ? "admin-movie-language-error" : undefined}
          />
          {errors.language && <small id="admin-movie-language-error" className="admin-field-error">{errors.language}</small>}
        </label>
        <label className="admin-form-field">
          <span>Release date</span>
          <input
            name="releaseDate"
            type="date"
            value={form.releaseDate}
            onChange={updateField}
            aria-invalid={Boolean(errors.releaseDate)}
            aria-describedby={errors.releaseDate ? "admin-movie-date-error" : undefined}
          />
          {errors.releaseDate && <small id="admin-movie-date-error" className="admin-field-error">{errors.releaseDate}</small>}
        </label>
        <label className="admin-form-field admin-form-wide">
          <span>Poster URL</span>
          <input
            name="posterUrl"
            type="url"
            value={form.posterUrl}
            onChange={updateField}
            aria-invalid={Boolean(errors.posterUrl)}
            aria-describedby={errors.posterUrl ? "admin-movie-poster-error" : undefined}
          />
          {errors.posterUrl && <small id="admin-movie-poster-error" className="admin-field-error">{errors.posterUrl}</small>}
        </label>
        <label className="admin-form-field admin-form-wide">
          <span>Description</span>
          <textarea
            name="description"
            value={form.description}
            onChange={updateField}
            rows="3"
          />
        </label>
      </div>
      {apiError && <p className="admin-form-error" role="alert">{apiError}</p>}
      {status === "success" && <p className="admin-form-success" role="status">“{createdTitle}” was added to the movie catalog.</p>}
      <button className="primary-button admin-submit-button" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Adding movie..." : "Add Movie"}
      </button>
    </form>
  );
}

export function validateCinemaForm(form) {
  const errors = {};
  const name = form.name.trim();
  const address = form.address.trim();
  const city = form.city.trim();
  const state = form.state.trim();
  const postalCode = form.postalCode.trim();

  if (!name) errors.name = "Enter a cinema name.";
  else if (name.length > 200) errors.name = "Name must be 200 characters or fewer.";
  if (!address) errors.address = "Enter an address.";
  if (!city) errors.city = "Enter a city.";
  else if (city.length > 100) errors.city = "City must be 100 characters or fewer.";
  if (!state) errors.state = "Enter a state.";
  else if (state.length > 100) errors.state = "State must be 100 characters or fewer.";
  if (postalCode.length > 10) errors.postalCode = "Postal code must be 10 characters or fewer.";

  return errors;
}

export function AddCinemaForm({ token, onCreated }) {
  const [form, setForm] = useState({ name: "", address: "", city: "", state: "", postalCode: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [apiError, setApiError] = useState("");
  const [createdName, setCreatedName] = useState("");
  const submissionInFlight = useRef(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setApiError("");
    setStatus((current) => (current === "error" ? "idle" : current));
  }

  async function submitCinema(event) {
    event.preventDefault();
    if (submissionInFlight.current) return;

    const validationErrors = validateCinemaForm(form);
    setErrors(validationErrors);
    setApiError("");
    setCreatedName("");
    if (Object.keys(validationErrors).length) {
      setStatus("idle");
      return;
    }

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
    };
    if (form.postalCode.trim()) payload.postalCode = form.postalCode.trim();

    submissionInFlight.current = true;
    setStatus("loading");
    try {
      const createdCinema = await createDashboardCinema(payload, token);
      setCreatedName(createdCinema.name);
      setForm({ name: "", address: "", city: "", state: "", postalCode: "" });
      setStatus("success");
      onCreated?.(createdCinema);
    } catch (error) {
      setApiError(error.message || "Unable to create the cinema.");
      setStatus("error");
    } finally {
      submissionInFlight.current = false;
    }
  }

  return (
    <form className="admin-movie-form" noValidate onSubmit={submitCinema}>
      <h3>Add Cinema</h3>
      <p className="admin-form-intro">Add a cinema location. Fields marked required must be completed.</p>
      <div className="admin-form-grid">
        <label className="admin-form-field">
          <span>Name <span aria-hidden="true">*</span></span>
          <input
            name="name"
            value={form.name}
            onChange={updateField}
            maxLength={200}
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "admin-cinema-name-error" : undefined}
          />
          {errors.name && <small id="admin-cinema-name-error" className="admin-field-error">{errors.name}</small>}
        </label>
        <label className="admin-form-field">
          <span>Address <span aria-hidden="true">*</span></span>
          <input
            name="address"
            value={form.address}
            onChange={updateField}
            required
            aria-invalid={Boolean(errors.address)}
            aria-describedby={errors.address ? "admin-cinema-address-error" : undefined}
          />
          {errors.address && <small id="admin-cinema-address-error" className="admin-field-error">{errors.address}</small>}
        </label>
        <label className="admin-form-field">
          <span>City <span aria-hidden="true">*</span></span>
          <input
            name="city"
            value={form.city}
            onChange={updateField}
            maxLength={100}
            required
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? "admin-cinema-city-error" : undefined}
          />
          {errors.city && <small id="admin-cinema-city-error" className="admin-field-error">{errors.city}</small>}
        </label>
        <label className="admin-form-field">
          <span>State <span aria-hidden="true">*</span></span>
          <input
            name="state"
            value={form.state}
            onChange={updateField}
            maxLength={100}
            required
            aria-invalid={Boolean(errors.state)}
            aria-describedby={errors.state ? "admin-cinema-state-error" : undefined}
          />
          {errors.state && <small id="admin-cinema-state-error" className="admin-field-error">{errors.state}</small>}
        </label>
        <label className="admin-form-field">
          <span>Postal code</span>
          <input
            name="postalCode"
            value={form.postalCode}
            onChange={updateField}
            maxLength={10}
            aria-invalid={Boolean(errors.postalCode)}
            aria-describedby={errors.postalCode ? "admin-cinema-postal-error" : undefined}
          />
          {errors.postalCode && <small id="admin-cinema-postal-error" className="admin-field-error">{errors.postalCode}</small>}
        </label>
      </div>
      {apiError && <p className="admin-form-error" role="alert">{apiError}</p>}
      {status === "success" && <p className="admin-form-success" role="status">“{createdName}” was added to the cinema list. Refreshing the list…</p>}
      <button className="primary-button admin-submit-button" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Adding cinema..." : "Add Cinema"}
      </button>
    </form>
  );
}
