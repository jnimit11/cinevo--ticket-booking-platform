import { z } from "zod";

export const createCinemaSchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().max(10).optional(),
});

export const listCinemasQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(2147483647).default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  city: z.string().trim().max(100).optional(),
});
