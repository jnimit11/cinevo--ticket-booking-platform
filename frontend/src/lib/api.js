const API_BASE_URL = "http://localhost:5000/api";

async function fetchJson(path, signal) {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal });
  let data;

  try {
    data = await response.json();
  } catch {
    const error = new Error("The movies API returned an invalid response.");
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      typeof data?.message === "string" ? data.message : "The movies request failed.",
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

export function buildMovieQuery({ page, limit, search, language } = {}) {
  const params = new URLSearchParams();

  if (page !== undefined && page !== null && String(page).trim() !== "") {
    const parsedPage = Number(page);
    if (Number.isInteger(parsedPage) && parsedPage > 0) {
      params.set("page", String(parsedPage));
    }
  }

  if (limit !== undefined && limit !== null && String(limit).trim() !== "") {
    const parsedLimit = Number(limit);
    if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
      params.set("limit", String(Math.min(parsedLimit, 50)));
    }
  }

  if (typeof search === "string" && search.trim() !== "") {
    params.set("search", search.trim().slice(0, 100));
  }

  if (typeof language === "string" && language.trim() !== "") {
    params.set("language", language.trim().slice(0, 50));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getMovies({
  page = 1,
  limit = 12,
  search,
  language,
  signal,
} = {}) {
  const query = buildMovieQuery({ page, limit, search, language });
  const data = await fetchJson(`/movies${query}`, signal);

  if (!Array.isArray(data?.movies)) {
    throw new Error("The movies API returned an invalid movie list.");
  }

  const pagination = data?.pagination;
  const total = Number(pagination?.total);
  const totalPages = Number(pagination?.totalPages);
  const currentPage = Number(pagination?.page);
  const currentLimit = Number(pagination?.limit);

  if (
    !pagination ||
    typeof pagination !== "object" ||
    !Number.isFinite(total) ||
    total < 0 ||
    !Number.isFinite(totalPages) ||
    totalPages < 0 ||
    !Number.isFinite(currentPage) ||
    currentPage < 1 ||
    !Number.isFinite(currentLimit) ||
    currentLimit < 1
  ) {
    throw new Error("The movies API returned invalid pagination data.");
  }

  return {
    movies: data.movies,
    pagination: {
      page: currentPage,
      limit: currentLimit,
      total,
      totalPages,
    },
    count: data.movies.length,
  };
}

async function getAllPages(path, collectionKey, { signal, query = {} } = {}) {
  const params = new URLSearchParams({ ...query, limit: "50" });
  const items = [];
  let page = 1;
  let totalPages;

  do {
    params.set("page", String(page));
    const data = await fetchJson(`${path}?${params}`, signal);

    if (!Array.isArray(data?.[collectionKey])) {
      const listName = collectionKey === "showtimes" ? "showtime list" : "list";
      throw new Error(`The ${collectionKey} API returned an invalid ${listName}.`);
    }

    if (!Number.isInteger(data.pagination?.totalPages) || data.pagination.totalPages < 0) {
      throw new Error(`The ${collectionKey} API returned invalid pagination data.`);
    }

    totalPages = data.pagination.totalPages;
    items.push(...data[collectionKey]);
    page += 1;
  } while (page <= totalPages);

  return items;
}

export function getDashboardMovies(options) {
  return getAllPages("/movies", "movies", options);
}

export function getDashboardCinemas(options) {
  return getAllPages("/cinemas", "cinemas", options);
}

export function getDashboardShowtimes(options) {
  return getAllPages("/showtimes", "showtimes", options);
}

export async function createDashboardMovie(movie, token) {
  const data = await postJson("/movies", movie, { token });

  if (
    !data?.movie ||
    typeof data.movie !== "object" ||
    Array.isArray(data.movie) ||
    typeof data.movie.id !== "string" ||
    typeof data.movie.title !== "string"
  ) {
    throw new Error("The movie API returned an invalid creation confirmation.");
  }

  return data.movie;
}

export async function createDashboardCinema(cinema, token) {
  const data = await postJson("/cinemas", cinema, { token });

  if (
    !data?.cinema ||
    typeof data.cinema !== "object" ||
    Array.isArray(data.cinema) ||
    typeof data.cinema.id !== "string" ||
    typeof data.cinema.name !== "string"
  ) {
    throw new Error("The cinema API returned an invalid creation confirmation.");
  }

  return data.cinema;
}

export async function createDashboardScreen(screen, token) {
  const data = await postJson("/screens", screen, { token });

  if (
    !data?.screen ||
    typeof data.screen !== "object" ||
    Array.isArray(data.screen) ||
    typeof data.screen.id !== "string" ||
    typeof data.screen.name !== "string"
  ) {
    throw new Error("The screen API returned an invalid creation confirmation.");
  }

  return data.screen;
}

export async function generateDashboardSeats(screenId, seatLayout, token) {
  const data = await postJson(
    `/screens/${encodeURIComponent(screenId)}/seats/generate`,
    seatLayout,
    { token },
  );

  if (
    data?.screenId !== screenId ||
    !Array.isArray(data.seats) ||
    !Number.isInteger(data.totalSeats) ||
    data.totalSeats !== data.seats.length
  ) {
    throw new Error("The seat generation API returned an invalid confirmation.");
  }

  return data;
}

export async function createDashboardShowtime(showtime, token) {
  const data = await postJson("/showtimes", showtime, { token });

  if (
    !data?.showtime ||
    typeof data.showtime !== "object" ||
    Array.isArray(data.showtime) ||
    typeof data.showtime.id !== "string" ||
    data.showtime.movieId !== showtime.movieId ||
    data.showtime.screenId !== showtime.screenId ||
    typeof data.showtime.startsAt !== "string" ||
    Number.isNaN(Date.parse(data.showtime.startsAt)) ||
    typeof data.showtime.endsAt !== "string" ||
    Number.isNaN(Date.parse(data.showtime.endsAt)) ||
    !Number.isInteger(data.showtime.priceInPaise) ||
    data.showtime.priceInPaise < 0
  ) {
    throw new Error("The showtime API returned an invalid creation confirmation.");
  }

  return data.showtime;
}

export async function getMovieById(id, { signal } = {}) {
  const data = await fetchJson(`/movies/${encodeURIComponent(id)}`, signal);

  if (!data?.movie || typeof data.movie !== "object" || Array.isArray(data.movie)) {
    throw new Error("The movies API returned an invalid movie.");
  }

  return data.movie;
}

export async function getShowtimesByMovieId(movieId, { signal } = {}) {
  return getAllPages("/showtimes", "showtimes", { signal, query: { movieId } });
}

export async function getSeatsForShowtime(showtimeId, { signal } = {}) {
  const data = await fetchJson(
    `/showtimes/${encodeURIComponent(showtimeId)}/seats`,
    signal,
  );

  if (
    !data?.showtime ||
    typeof data.showtime !== "object" ||
    !Array.isArray(data.seats) ||
    !data.seats.every(
      (seat) =>
        typeof seat?.id === "string" &&
        typeof seat.rowLabel === "string" &&
        Number.isInteger(seat.seatNumber) &&
        typeof seat.seatType === "string" &&
        (seat.status === "available" || seat.status === "booked"),
    )
  ) {
    throw new Error("The seat API returned an invalid seat layout.");
  }

  return data.seats;
}

async function postJson(path, body, { signal, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  let data;

  try {
    data = await response.json();
  } catch {
    const error = new Error("The API returned an invalid response.");
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      typeof data?.message === "string" ? data.message : "The request failed.",
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

async function authenticatedRequest(path, token, { method = "GET", signal } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  let data;

  try {
    data = await response.json();
  } catch {
    const error = new Error("The bookings API returned an invalid response.");
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      typeof data?.message === "string" ? data.message : "The bookings request failed.",
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function authenticate({ name, email, password }, mode) {
  const isRegistration = mode === "register";
  const data = await postJson(
    `/auth/${isRegistration ? "register" : "login"}`,
    isRegistration ? { name, email, password } : { email, password },
  );

  if (typeof data.token !== "string" || !data.user || typeof data.user !== "object") {
    throw new Error("The authentication API returned an invalid response.");
  }

  return { token: data.token, user: data.user };
}

export async function getMyBookings(token, { signal } = {}) {
  const data = await authenticatedRequest("/bookings/my", token, { signal });
  if (!Array.isArray(data?.bookings)) {
    throw new Error("The booking history API returned an invalid booking list.");
  }
  return data.bookings;
}

export async function cancelExistingBooking(bookingId, token) {
  const data = await authenticatedRequest(
    `/bookings/${encodeURIComponent(bookingId)}/cancel`,
    token,
    { method: "PATCH" },
  );

  if (!data?.booking || data.booking.id !== bookingId || data.booking.status !== "cancelled") {
    throw new Error("The cancellation API returned an invalid confirmation.");
  }

  return data;
}

export async function createBooking({ showtimeId, seatIds }, token) {
  const data = await postJson("/bookings", { showtimeId, seatIds }, { token });

  if (
    !data?.booking ||
    typeof data.booking.id !== "string" ||
    !Array.isArray(data.seats) ||
    !data.seats.every((seat) => typeof seat.seatId === "string")
  ) {
    throw new Error("The booking API returned an invalid confirmation.");
  }

  return data;
}
