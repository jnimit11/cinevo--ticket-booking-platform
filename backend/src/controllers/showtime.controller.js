import { and, count, desc, eq, gte, gt, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  bookingSeats,
  bookings,
  cinemas,
  movies,
  screens,
  seats,
  showtimes,
} from "../db/schema/index.js";
import {
  createShowtimeSchema,
  listShowtimesQuerySchema,
} from "../validators/showtime.validator.js";

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
    const [conflictingShowtime] = await db
      .select({ id: showtimes.id })
      .from(showtimes)
      .where(
        and(
          eq(showtimes.screenId, screenId),
          lt(showtimes.startsAt, end),
          gt(showtimes.endsAt, start),
        ),
      )
      .limit(1);

    if (conflictingShowtime) {
      return res.status(409).json({
        success: false,
        message: "This screen already has a show scheduled during that time",
      });
    }

    const [showtime] = await db
      .insert(showtimes)
      .values({
        movieId,
        screenId,
        startsAt: start,
        endsAt: end,
        priceInPaise,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Showtime created successfully",
      showtime,
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

    const { movieId, screenId, date, page, limit } = validation.data;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (movieId) {
      conditions.push(eq(showtimes.movieId, movieId));
    }

    if (screenId) {
      conditions.push(eq(showtimes.screenId, screenId));
    }

    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);

      conditions.push(gte(showtimes.startsAt, start));
      conditions.push(lt(showtimes.startsAt, end));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const results = await db
      .select({
        id: showtimes.id,
        startsAt: showtimes.startsAt,
        endsAt: showtimes.endsAt,
        priceInPaise: showtimes.priceInPaise,
        movieId: movies.id,
        movieTitle: movies.title,
        durationMinutes: movies.durationMinutes,
        screenId: screens.id,
        screenName: screens.name,
        cinemaId: cinemas.id,
        cinemaName: cinemas.name,
        city: cinemas.city,
      })
      .from(showtimes)
      .innerJoin(movies, eq(showtimes.movieId, movies.id))
      .innerJoin(screens, eq(showtimes.screenId, screens.id))
      .innerJoin(cinemas, eq(screens.cinemaId, cinemas.id))
      .where(whereClause)
      .orderBy(showtimes.startsAt)
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ total: count() })
      .from(showtimes)
      .where(whereClause);

    const total = Number(countResult.total);

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      count: results.length,
      showtimes: results,
    });
  } catch (error) {
    next(error);
  }
}

export async function getShowtimeSeats(req, res, next) {
  try {
    const { showtimeId } = req.params;

    // Find the requested showtime.
    const [showtime] = await db
      .select({
        id: showtimes.id,
        startsAt: showtimes.startsAt,
        endsAt: showtimes.endsAt,
        priceInPaise: showtimes.priceInPaise,
        screenId: screens.id,
        screenName: screens.name,
        cinemaName: cinemas.name,
        movieTitle: movies.title,
      })
      .from(showtimes)
      .innerJoin(movies, eq(showtimes.movieId, movies.id))
      .innerJoin(screens, eq(showtimes.screenId, screens.id))
      .innerJoin(cinemas, eq(screens.cinemaId, cinemas.id))
      .where(eq(showtimes.id, showtimeId))
      .limit(1);

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: "Showtime not found.",
      });
    }

    // Fetch physical seats belonging to this screen.
    const screenSeats = await db
      .select({
        id: seats.id,
        rowLabel: seats.rowLabel,
        seatNumber: seats.seatNumber,
        seatType: seats.seatType,
        bookingId: bookings.id,
      })
      .from(seats)
      .leftJoin(
        bookingSeats,
        and(
          eq(bookingSeats.seatId, seats.id),
          eq(bookingSeats.showtimeId, showtime.id),
        ),
      )
      .leftJoin(
        bookings,
        and(
          eq(bookings.id, bookingSeats.bookingId),
          eq(bookings.status, "confirmed"),
        ),
      )
      .where(eq(seats.screenId, showtime.screenId))
      .orderBy(seats.rowLabel, seats.seatNumber);

    const seatsWithStatus = screenSeats.map(({ bookingId, ...seat }) => ({
      ...seat,
      status: bookingId !== null ? "booked" : "available",
    }));
    const bookedSeats = seatsWithStatus.filter(
      (seat) => seat.status === "booked",
    ).length;
    const totalSeats = seatsWithStatus.length;

    return res.status(200).json({
      success: true,
      showtime,
      totalSeats,
      availableSeats: totalSeats - bookedSeats,
      bookedSeats,
      seats: seatsWithStatus,
    });
  } catch (error) {
    next(error);
  }
}
