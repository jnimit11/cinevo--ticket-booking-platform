import { and, count, desc, eq, gt, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "../../core/db/client.js";
import { showtimes } from "./showtime.schema.js";
import { movies } from "../movies/movie.schema.js";
import { screens, seats } from "../screens/screen.schema.js";
import { cinemas } from "../cinemas/cinema.schema.js";
import { bookings, bookingSeats } from "../bookings/booking.schema.js";

export async function createShowtimeWithOverlapGuard(database, showtime) {
  return database.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${"cinevo.showtime:" + showtime.screenId}, 0))`,
    );

    const [conflict] = await tx
      .select({ id: showtimes.id })
      .from(showtimes)
      .where(
        and(
          eq(showtimes.screenId, showtime.screenId),
          lt(showtimes.startsAt, showtime.endsAt),
          gt(showtimes.endsAt, showtime.startsAt),
        ),
      )
      .limit(1);

    if (conflict) return { conflict: true };

    const [created] = await tx
      .insert(showtimes)
      .values(showtime)
      .returning();

    return { conflict: false, showtime: created };
  });
}

export async function fetchShowtimes({ movieId, screenId, date, page, limit }) {
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

  return {
    showtimes: results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    count: results.length,
  };
}

export async function fetchShowtimeSeats(showtimeId) {
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
    return null;
  }

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
        isNull(bookingSeats.releasedAt),
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

  return {
    showtime,
    totalSeats,
    availableSeats: totalSeats - bookedSeats,
    bookedSeats,
    seats: seatsWithStatus,
  };
}
