import { z } from "zod";

export const screenIdSchema = z.uuid({
  message: "Invalid screen ID format: must be a valid UUID.",
});

export const createScreenSchema = z.object({
  cinemaId: z.uuid({ message: "Invalid cinema ID: must be a valid UUID." }),
  name: z.string().trim().min(1).max(100),
  totalSeats: z.number().int().min(1).max(1000),
});

export const generateSeatsSchema = z.object({
  rows: z.number().int().min(1).max(10),
  seatsPerRow: z.number().int().min(1).max(12),
  seatType: z.enum(["regular", "premium", "recliner"]).default("regular"),
});
