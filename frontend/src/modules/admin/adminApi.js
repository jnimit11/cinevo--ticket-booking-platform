import { API_BASE_URL } from "../../core/config/constants.js";

async function postJson(path, body, { token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The API returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data?.message || "Operation failed.");
  }

  return data;
}

export async function createDashboardMovie(movie, token) {
  const data = await postJson("/movies", movie, { token });
  return data.movie;
}

export async function createDashboardCinema(cinema, token) {
  const data = await postJson("/cinemas", cinema, { token });
  return data.cinema;
}

export async function createDashboardScreen(screen, token) {
  const data = await postJson("/screens", screen, { token });
  return data.screen;
}

export async function generateDashboardSeats(screenId, seatLayout, token) {
  const data = await postJson(
    `/screens/${encodeURIComponent(screenId)}/seats/generate`,
    seatLayout,
    { token },
  );
  return data;
}

export async function createDashboardShowtime(showtime, token) {
  const data = await postJson("/showtimes", showtime, { token });
  return data.showtime;
}
