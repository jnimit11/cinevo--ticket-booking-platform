import { API_BASE_URL } from "../../core/config/constants.js";

export async function getMyBookings(token, { signal } = {}) {
  const response = await fetch(`${API_BASE_URL}/bookings/my`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The booking history API returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data?.message || "Failed to load booking history.");
  }

  if (!Array.isArray(data?.bookings)) {
    throw new Error("The booking history API returned an invalid booking list.");
  }

  return data.bookings;
}

export async function cancelExistingBooking(bookingId, token) {
  const response = await fetch(
    `${API_BASE_URL}/bookings/${encodeURIComponent(bookingId)}/cancel`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The cancellation API returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data?.message || "Failed to cancel booking.");
  }

  return data;
}
