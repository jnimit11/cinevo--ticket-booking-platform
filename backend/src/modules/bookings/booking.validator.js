import { z } from "zod";

export const bookingIdSchema = z.uuid({
  message: "Invalid booking ID format: must be a valid UUID.",
});

export const createBookingSchema = z.object({
  showtimeId: z.uuid({ message: "Invalid showtime ID: must be a valid UUID." }),
  seatIds: z.array(z.uuid({ message: "Invalid seat ID: must be a valid UUID." })).min(1).max(12),
});
