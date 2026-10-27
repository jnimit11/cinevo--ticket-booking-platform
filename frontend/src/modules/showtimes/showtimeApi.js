import { API_BASE_URL } from "../../core/config/constants.js";

export async function getShowtimesByMovieId(movieId, { signal } = {}) {
  const params = new URLSearchParams({ movieId, limit: "50" });
  const items = [];
  let page = 1;
  let totalPages;

  do {
    params.set("page", String(page));
    const response = await fetch(`${API_BASE_URL}/showtimes?${params}`, { signal });
    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("The showtimes API returned an invalid response.");
    }

    if (!response.ok) {
      throw new Error(data?.message || "Failed to load showtimes.");
    }

    if (!Array.isArray(data?.showtimes)) {
      throw new Error("The showtimes API returned an invalid showtime list.");
    }

    totalPages = data?.pagination?.totalPages || 1;
    items.push(...data.showtimes);
    page += 1;
  } while (page <= totalPages);

  return items;
}
