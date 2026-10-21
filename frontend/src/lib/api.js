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

export async function getMovies({ signal } = {}) {
  const data = await fetchJson("/movies", signal);

  if (!Array.isArray(data?.movies)) {
    throw new Error("The movies API returned an invalid movie list.");
  }

  return data.movies;
}

export async function getMovieById(id, { signal } = {}) {
  const data = await fetchJson(`/movies/${encodeURIComponent(id)}`, signal);

  if (!data?.movie || typeof data.movie !== "object" || Array.isArray(data.movie)) {
    throw new Error("The movies API returned an invalid movie.");
  }

  return data.movie;
}

export async function getShowtimesByMovieId(movieId, { signal } = {}) {
  const params = new URLSearchParams({ movieId, limit: "50" });
  let page = 1;
  const showtimes = [];
  let totalPages;

  do {
    params.set("page", String(page));
    const data = await fetchJson(`/showtimes?${params}`, signal);

    if (!Array.isArray(data?.showtimes)) {
      throw new Error("The showtimes API returned an invalid showtime list.");
    }

    if (!Number.isInteger(data.pagination?.totalPages) || data.pagination.totalPages < 0) {
      throw new Error("The showtimes API returned invalid pagination data.");
    }

    totalPages = data.pagination.totalPages;
    showtimes.push(...data.showtimes);
    page += 1;
  } while (page <= totalPages);

  return showtimes;
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
