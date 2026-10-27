import { z } from "zod";

export const showtimeIdSchema = z.uuid({
  message: "Invalid showtime ID format: must be a valid UUID.",
});

export const createShowtimeSchema = z
  .object({
    movieId: z.uuid({ message: "Invalid movie ID: must be a valid UUID." }),
    screenId: z.uuid({ message: "Invalid screen ID: must be a valid UUID." }),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    priceInPaise: z.number().int().min(0).max(10_000_000),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "End time must be after start time",
    path: ["endsAt"],
  });

export const listShowtimesQuerySchema = z.object({
  movieId: z.uuid().optional(),
  screenId: z.uuid().optional(),
  date: z.iso.date().optional(),
  page: z.coerce.number().int().positive().max(2147483647).default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
