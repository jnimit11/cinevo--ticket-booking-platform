import { API_BASE_URL } from "../../core/config/constants.js";

export async function getSeatsForShowtime(showtimeId, { signal } = {}) {
  const response = await fetch(
    `${API_BASE_URL}/showtimes/${encodeURIComponent(showtimeId)}/seats`,
    { signal },
  );

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The seat API returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data?.message || "Failed to load seat layout.");
  }

  if (!Array.isArray(data?.seats)) {
    throw new Error("The seat API returned an invalid seat layout.");
  }

  return data.seats;
}

export async function createBooking({ showtimeId, seatIds }, token) {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ showtimeId, seatIds }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The booking API returned an invalid response.");
  }

  if (!response.ok) {
    const error = new Error(data?.message || "Booking request failed.");
    error.status = response.status;
    throw error;
  }

  return data;
}
