import { z } from "zod";

export const createCinemaSchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().max(10).optional(),
});
