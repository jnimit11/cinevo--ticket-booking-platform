
import { z } from "zod";

export const generateSeatsSchema = z.object({
  rows: z.number().int().min(1).max(10),
  seatsPerRow: z.number().int().min(1).max(12),
  seatType: z.enum(["regular", "premium", "recliner"]).default("regular"),
});
