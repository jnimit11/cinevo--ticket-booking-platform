import { z } from "zod";

export const movieIdSchema = z.uuid();

export const createMovieSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().optional(),
  durationMinutes: z.number().int().min(1).max(1000),
  language: z.string().trim().min(1).max(50),
  releaseDate: z.iso.date().optional(),
  posterUrl: z.url().optional(),
});

export const listMoviesQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(2147483647).default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  search: z.string().trim().max(100).optional(),
  language: z.string().trim().min(1).max(50).optional(),
});
