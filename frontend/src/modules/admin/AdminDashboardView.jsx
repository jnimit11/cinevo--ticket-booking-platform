import { useState, useEffect } from "react";
import {
  getDashboardMovies,
  getDashboardCinemas,
  getDashboardShowtimes,
} from "./adminApi.js";
import { AddMovieForm, AddCinemaForm } from "./AddMovieForm.jsx";
import { ScreenManagementSection, ShowtimeForm } from "./ScreenSeatGenerator.jsx";
import { useAuth } from "../auth/index.js";
import { formatShowtimeDateTime } from "../../core/utils/date.js";

function AdminListSection({
  title,
  description,
  loadItems,
  renderItem,
  token,
  showAddMovie = false,
  showAddCinema = false,
  showAddShowtime = false,
  screens = [],
  icon = "category",
}) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [createdItem, setCreatedItem] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    loadItems({ signal: controller.signal })
      .then((loadedItems) => {
        setItems(
          createdItem && !loadedItems.some((item) => item.id === createdItem.id)
            ? [createdItem, ...loadedItems]
            : loadedItems,
        );
        setStatus("success");
      })
      .catch((loadError) => {
        if (controller.signal.aborted) return;
        const createdLabel = createdItem?.name || createdItem?.title || createdItem?.movieTitle;
        const refreshMessage = createdItem
          ? `${createdLabel ? `“${createdLabel}” was created, but ` : "The item was created, but "}the ${title.toLowerCase()} list could not be refreshed.`
          : "";
        setError(
          refreshMessage
            ? `${refreshMessage} ${loadError.message || "Please retry the list refresh."}`
            : loadError.message || `Unable to load ${title.toLowerCase()}.`,
        );
        setStatus("error");
      });

    return () => controller.abort();
  }, [createdItem, loadAttempt, loadItems, title]);

  function retryLoading() {
    setStatus("loading");
    setError("");
    setLoadAttempt((attempt) => attempt + 1);
  }

  function handleItemCreated(item) {
    setCreatedItem(item);
    setItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)]);
    setStatus("loading");
    setError("");
    setLoadAttempt((attempt) => attempt + 1);
  }

  const renderedItems = items.length ? (
    <ul className="admin-item-list">
      {items.map((item) => (
        <li className="admin-item" key={item.id}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div>
          <span className="section-kicker">CATALOG</span>
          <div className="admin-title-row">
            <span className="material-symbols-outlined admin-title-icon crimson" aria-hidden="true">
              {icon}
            </span>
            <h2>{title}</h2>
          </div>
          <p>{description}</p>
        </div>
        {status === "success" && <span className="admin-count">{items.length} listed</span>}
      </div>
      {status === "loading" ? (
        <p className="admin-state" role="status">Loading {title.toLowerCase()}...</p>
      ) : status === "error" ? (
        <>
          <div className="admin-state" role="alert">
            <p>{error}</p>
            <button className="secondary-button" type="button" onClick={retryLoading}>
              Try again
            </button>
          </div>
          {renderedItems}
        </>
      ) : renderedItems ? (
        renderedItems
      ) : (
        <p className="admin-state">No {title.toLowerCase()} are available.</p>
      )}
      {showAddMovie && <AddMovieForm token={token} onCreated={handleItemCreated} />}
      {showAddCinema && <AddCinemaForm token={token} onCreated={handleItemCreated} />}
      {showAddShowtime && <ShowtimeForm token={token} screens={screens} onCreated={handleItemCreated} />}
      <p className="admin-capability">
        {showAddMovie || showAddCinema || showAddShowtime
          ? "Edit and delete endpoints are not available."
          : "Create endpoint exists; dashboard forms are not available. Edit and delete endpoints are not available."}
      </p>
    </section>
  );
}

export function AdminDashboardView({ onBack }) {
  const { token, authSession } = useAuth();
  const [screensCreatedThisSession, setScreensCreatedThisSession] = useState([]);
  const effectiveToken = token || authSession?.token;

  return (
    <main className="admin-page">
      <button className="secondary-button back-button" type="button" onClick={onBack}>
        <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">
          arrow_back
        </span>
        <span>Back to Movies</span>
      </button>
      <header className="admin-page-heading">
        <span className="section-kicker">CINEVO MANAGEMENT</span>
        <h1>Admin Dashboard</h1>
        <p>Catalog overview from the existing Cinevo APIs.</p>
      </header>
      <div className="admin-grid">
        <AdminListSection
          title="Movies"
          icon="movie"
          description="Movie records currently in the catalog."
          loadItems={getDashboardMovies}
          token={effectiveToken}
          showAddMovie
          renderItem={(movie) => (
            <>
              <strong>{movie.title}</strong>
              <span>
                {[
                  movie.language,
                  movie.durationMinutes ? `${movie.durationMinutes} min` : "",
                ]
                  .filter(Boolean)
                  .join(" · ") || "Movie details unavailable"}
              </span>
            </>
          )}
        />
        <AdminListSection
          title="Cinemas"
          icon="theater_comedy"
          description="Cinema locations registered with Cinevo."
          loadItems={getDashboardCinemas}
          renderItem={(cinema) => (
            <>
              <strong>{cinema.name}</strong>
              <span>
                {[cinema.city, cinema.state].filter(Boolean).join(", ") ||
                  cinema.address ||
                  "Location details unavailable"}
              </span>
            </>
          )}
          token={effectiveToken}
          showAddCinema
        />
        <ScreenManagementSection
          token={effectiveToken}
          screensCreatedThisSession={screensCreatedThisSession}
          setScreensCreatedThisSession={setScreensCreatedThisSession}
        />
        <AdminListSection
          title="Showtimes"
          icon="schedule"
          description="Scheduled screenings returned by the existing list API."
          loadItems={getDashboardShowtimes}
          token={effectiveToken}
          screens={screensCreatedThisSession}
          showAddShowtime
          renderItem={(showtime) => (
            <>
              <strong>{showtime.movieTitle}</strong>
              <span>{[showtime.cinemaName, showtime.screenName].filter(Boolean).join(" · ")}</span>
              <span>{formatShowtimeDateTime(showtime.startsAt) || "Start time unavailable"}</span>
            </>
          )}
        />
      </div>
    </main>
  );
}
