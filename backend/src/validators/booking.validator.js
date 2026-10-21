import { z } from "zod";

export const createBookingSchema = z.object({
  showtimeId: z.uuid(),
  seatIds: z.array(z.uuid()).min(1).max(12),
});
