import { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "../../core/config/constants.js";
import { AddMovieForm, AddCinemaForm } from "./AddMovieForm.jsx";
import { ScreenSeatGenerator, ShowtimeScheduler } from "./ScreenSeatGenerator.jsx";
import { Modal } from "../../shared/components/Modal/Modal.jsx";
import { Spinner } from "../../shared/components/Spinner/Spinner.jsx";
import { useAuth } from "../auth/index.js";
import { formatTicketPrice } from "../../core/utils/currency.js";
import { formatShowtimeDateTime } from "../../core/utils/date.js";

export function AdminDashboardView({ onBack }) {
  const [activeTab, setActiveTab] = useState("movies");
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [screens, setScreens] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null); // 'movie' | 'cinema' | 'screen' | 'showtime' | null

  const { token } = useAuth();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [moviesRes, cinemasRes, showtimesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/movies?limit=50`),
        fetch(`${API_BASE_URL}/cinemas?limit=50`),
        fetch(`${API_BASE_URL}/showtimes?limit=50`),
      ]);

      const [mJson, cJson, sJson] = await Promise.all([
        moviesRes.json(),
        cinemasRes.json(),
        showtimesRes.json(),
      ]);

      setMovies(mJson.movies || []);
      setCinemas(cJson.cinemas || []);
      setShowtimes(sJson.showtimes || []);

      const screenMap = new Map();
      (sJson.showtimes || []).forEach((st) => {
        if (st.screenId && !screenMap.has(st.screenId)) {
          screenMap.set(st.screenId, {
            id: st.screenId,
            name: st.screenName,
            cinemaName: st.cinemaName,
          });
        }
      });
      setScreens(Array.from(screenMap.values()));
    } catch (err) {
      console.warn("Failed to load admin dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      fetch(`${API_BASE_URL}/movies?limit=50`),
      fetch(`${API_BASE_URL}/cinemas?limit=50`),
      fetch(`${API_BASE_URL}/showtimes?limit=50`),
    ])
      .then(([moviesRes, cinemasRes, showtimesRes]) =>
        Promise.all([moviesRes.json(), cinemasRes.json(), showtimesRes.json()]),
      )
      .then(([mJson, cJson, sJson]) => {
        if (!ignore) {
          setMovies(mJson.movies || []);
          setCinemas(cJson.cinemas || []);
          setShowtimes(sJson.showtimes || []);

          const screenMap = new Map();
          (sJson.showtimes || []).forEach((st) => {
            if (st.screenId && !screenMap.has(st.screenId)) {
              screenMap.set(st.screenId, {
                id: st.screenId,
                name: st.screenName,
                cinemaName: st.cinemaName,
              });
            }
          });
          setScreens(Array.from(screenMap.values()));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.warn("Failed to load admin dashboard data:", err);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleCreated = () => {
    setActiveModal(null);
    loadData();
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="secondary-button back-button" type="button" onClick={onBack}>
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }} aria-hidden="true">
            arrow_back
          </span>
          <span>Back to Movies</span>
        </button>

        <div className="admin-title-row">
          <div>
            <span className="section-kicker">CONCIERGE MANAGEMENT PORTAL</span>
            <h1 className="page-title">Executive Operations</h1>
          </div>

          <div className="admin-actions-bar">
            {activeTab === "movies" && (
              <button className="primary-button" type="button" onClick={() => setActiveModal("movie")}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  add
                </span>
                <span>Add Movie</span>
              </button>
            )}
            {activeTab === "cinemas" && (
              <button className="primary-button" type="button" onClick={() => setActiveModal("cinema")}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  add
                </span>
                <span>Add Cinema</span>
              </button>
            )}
            {activeTab === "screens" && (
              <button className="primary-button" type="button" onClick={() => setActiveModal("screen")}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  add
                </span>
                <span>Add Screen &amp; Seats</span>
              </button>
            )}
            {activeTab === "showtimes" && (
              <button className="primary-button" type="button" onClick={() => setActiveModal("showtime")}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  add
                </span>
                <span>Schedule Showtime</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tabs-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "movies"}
            className={`admin-tab-btn ${activeTab === "movies" ? "active" : ""}`}
            onClick={() => setActiveTab("movies")}
          >
            Movies ({movies.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "cinemas"}
            className={`admin-tab-btn ${activeTab === "cinemas" ? "active" : ""}`}
            onClick={() => setActiveTab("cinemas")}
          >
            Cinemas ({cinemas.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "screens"}
            className={`admin-tab-btn ${activeTab === "screens" ? "active" : ""}`}
            onClick={() => setActiveTab("screens")}
          >
            Screen Layouts
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "showtimes"}
            className={`admin-tab-btn ${activeTab === "showtimes" ? "active" : ""}`}
            onClick={() => setActiveTab("showtimes")}
          >
            Showtimes ({showtimes.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="status-panel">
          <Spinner message="Loading management records..." />
        </div>
      ) : (
        <div className="admin-tab-content">
          {activeTab === "movies" && (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Language</th>
                    <th>Runtime</th>
                    <th>Release Date</th>
                  </tr>
                </thead>
                <tbody>
                  {movies.map((m) => (
                    <tr key={m.id}>
                      <td className="font-semibold">{m.title}</td>
                      <td>{m.language}</td>
                      <td>{m.durationMinutes} min</td>
                      <td>{m.releaseDate || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "cinemas" && (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Venue Name</th>
                    <th>City</th>
                    <th>Address</th>
                    <th>Postal Code</th>
                  </tr>
                </thead>
                <tbody>
                  {cinemas.map((c) => (
                    <tr key={c.id}>
                      <td className="font-semibold">{c.name}</td>
                      <td>{c.city}</td>
                      <td>{c.address}</td>
                      <td>{c.postalCode || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "screens" && (
            <div className="admin-card-grid">
              {cinemas.map((c) => (
                <div key={c.id} className="admin-card">
                  <h3 className="admin-card-title">{c.name}</h3>
                  <p className="admin-card-desc">{c.address}, {c.city}</p>
                  <button
                    className="secondary-button"
                    type="button"
                    style={{ marginTop: "1rem" }}
                    onClick={() => setActiveModal("screen")}
                  >
                    Configure Screens &amp; Seats
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === "showtimes" && (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Movie</th>
                    <th>Cinema &amp; Screen</th>
                    <th>Schedule</th>
                    <th>Ticket Price</th>
                  </tr>
                </thead>
                <tbody>
                  {showtimes.map((st) => (
                    <tr key={st.id}>
                      <td className="font-semibold">{st.movieTitle}</td>
                      <td>{st.cinemaName} &bull; {st.screenName}</td>
                      <td>{formatShowtimeDateTime(st.startsAt)}</td>
                      <td>{formatTicketPrice(st.priceInPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Creation Modals */}
      <Modal isOpen={activeModal === "movie"} onClose={() => setActiveModal(null)} title="Publish New Movie">
        <AddMovieForm token={token} onCreated={handleCreated} />
      </Modal>

      <Modal isOpen={activeModal === "cinema"} onClose={() => setActiveModal(null)} title="Register Cinema Venue">
        <AddCinemaForm token={token} onCreated={handleCreated} />
      </Modal>

      <Modal isOpen={activeModal === "screen"} onClose={() => setActiveModal(null)} title="Configure Screen &amp; Seat Layout">
        <ScreenSeatGenerator cinemas={cinemas} token={token} onCreated={handleCreated} />
      </Modal>

      <Modal isOpen={activeModal === "showtime"} onClose={() => setActiveModal(null)} title="Schedule New Screening">
        <ShowtimeScheduler movies={movies} screens={screens} token={token} onCreated={handleCreated} />
      </Modal>
    </div>
  );
}
