import { eq } from "drizzle-orm";
import { db } from "../../core/db/client.js";
import { movies } from "../movies/movie.schema.js";
import { screens } from "../screens/screen.schema.js";
import {
  createShowtimeSchema,
  listShowtimesQuerySchema,
  showtimeIdSchema,
} from "./showtime.validator.js";
import {
  createShowtimeWithOverlapGuard,
  fetchShowtimes,
  fetchShowtimeSeats,
} from "./showtime.service.js";

export async function createShowtime(req, res, next) {
  try {
    const validation = createShowtimeSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid showtime data",
        errors: validation.error.issues,
      });
    }

    const { movieId, screenId, startsAt, endsAt, priceInPaise } =
      validation.data;

    const [movie] = await db
      .select({ id: movies.id, durationMinutes: movies.durationMinutes })
      .from(movies)
      .where(eq(movies.id, movieId))
      .limit(1);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    const [screen] = await db
      .select({ id: screens.id })
      .from(screens)
      .where(eq(screens.id, screenId))
      .limit(1);

    if (!screen) {
      return res.status(404).json({
        success: false,
        message: "Screen not found",
      });
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const expectedDuration = movie.durationMinutes * 60 * 1000;

    if (end.getTime() - start.getTime() < expectedDuration) {
      return res.status(400).json({
        success: false,
        message: "Show duration cannot be shorter than movie duration",
      });
    }

    const result = await createShowtimeWithOverlapGuard(db, {
      movieId,
      screenId,
      startsAt: start,
      endsAt: end,
      priceInPaise,
    });

    if (result.conflict) {
      return res.status(409).json({
        success: false,
        message: "This screen already has a show scheduled during that time",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Showtime created successfully",
      showtime: result.showtime,
    });
  } catch (error) {
    next(error);
  }
}

export async function getShowtimes(req, res, next) {
  try {
    const validation = listShowtimesQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid showtime query",
        errors: validation.error.issues,
      });
    }

    const data = await fetchShowtimes(validation.data);

    return res.status(200).json({
      success: true,
      pagination: data.pagination,
      count: data.count,
      showtimes: data.showtimes,
    });
  } catch (error) {
    next(error);
  }
}

export async function getShowtimeSeats(req, res, next) {
  try {
    const idValidation = showtimeIdSchema.safeParse(req.params.showtimeId);
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid showtime ID format: must be a valid UUID.",
        errors: idValidation.error.issues,
      });
    }

    const result = await fetchShowtimeSeats(idValidation.data);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Showtime not found.",
      });
    }

    return res.status(200).json({
      success: true,
      showtime: result.showtime,
      totalSeats: result.totalSeats,
      availableSeats: result.availableSeats,
      bookedSeats: result.bookedSeats,
      seats: result.seats,
    });
  } catch (error) {
    next(error);
  }
}
