import { z } from "zod";

export const createScreenSchema = z.object({
  cinemaId: z.uuid(),
  name: z.string().trim().min(1).max(100),
  totalSeats: z.number().int().positive(),
});
