import { z } from "zod";

export const createShowtimeSchema = z
  .object({
    movieId: z.uuid(),
    screenId: z.uuid(),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    priceInPaise: z.number().int().nonnegative(),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "End time must be after start time",
    path: ["endsAt"],
  });

export const listShowtimesQuerySchema = z.object({
  movieId: z.uuid().optional(),
  screenId: z.uuid().optional(),
  date: z.iso.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
