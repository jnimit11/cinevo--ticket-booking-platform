import { useState } from "react";
import { createDashboardMovie, createDashboardCinema } from "./adminApi.js";

export function AddMovieForm({ token, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    durationMinutes: 120,
    language: "English",
    releaseDate: "",
    posterUrl: "",
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        durationMinutes: Number(form.durationMinutes),
        language: form.language.trim(),
        releaseDate: form.releaseDate || undefined,
        posterUrl: form.posterUrl.trim() || undefined,
      };

      await createDashboardMovie(payload, token);
      setStatus("idle");
      onCreated?.();
    } catch (err) {
      setError(err.message || "Failed to create movie.");
      setStatus("error");
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label className="admin-field">
        <span>Movie Title *</span>
        <input
          type="text"
          required
          maxLength={200}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </label>

      <label className="admin-field">
        <span>Synopsis</span>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </label>

      <div className="admin-form-row">
        <label className="admin-field">
          <span>Runtime (Minutes) *</span>
          <input
            type="number"
            required
            min={1}
            max={1000}
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
          />
        </label>

        <label className="admin-field">
          <span>Language *</span>
          <input
            type="text"
            required
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value })}
          />
        </label>
      </div>

      <div className="admin-form-row">
        <label className="admin-field">
          <span>Release Date</span>
          <input
            type="date"
            value={form.releaseDate}
            onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
          />
        </label>

        <label className="admin-field">
          <span>Poster Image URL</span>
          <input
            type="url"
            placeholder="https://..."
            value={form.posterUrl}
            onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
          />
        </label>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <button className="primary-button" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Publishing Movie..." : "Publish Movie"}
      </button>
    </form>
  );
}

export function AddCinemaForm({ token, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      await createDashboardCinema(form, token);
      setStatus("idle");
      onCreated?.();
    } catch (err) {
      setError(err.message || "Failed to create cinema.");
      setStatus("error");
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label className="admin-field">
        <span>Venue / Cinema Name *</span>
        <input
          type="text"
          required
          maxLength={200}
          placeholder="e.g. Cinevo Grand Opus"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>

      <label className="admin-field">
        <span>Street Address *</span>
        <input
          type="text"
          required
          placeholder="e.g. 100 Promenade Way"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </label>

      <div className="admin-form-row">
        <label className="admin-field">
          <span>City *</span>
          <input
            type="text"
            required
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </label>

        <label className="admin-field">
          <span>State *</span>
          <input
            type="text"
            required
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
          />
        </label>

        <label className="admin-field">
          <span>Postal Code</span>
          <input
            type="text"
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
          />
        </label>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <button className="primary-button" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Registering Venue..." : "Register Venue"}
      </button>
    </form>
  );
}
