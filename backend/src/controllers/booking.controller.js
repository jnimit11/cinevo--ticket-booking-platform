import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  bookingSeats,
  bookings,
  seats,
  showtimes,
} from "../db/schema/index.js";
import { createBookingSchema } from "../validators/booking.validator.js";

export async function createBooking(req, res, next) {
  try {
    const parsed = createBookingSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking data.",
        errors: parsed.error.issues,
      });
    }

    const { showtimeId, seatIds } = parsed.data;
    const userId = req.auth.userId;

    // Reject repeated seat IDs in the same request.
    if (new Set(seatIds).size !== seatIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate seat IDs are not allowed.",
      });
    }

    const result = await db.transaction(async (tx) => {
      // Lock the showtime row to serialize bookings for this show.
      const lockedShowtime = await tx.execute(
        // The query is parameterized by PostgreSQL through Drizzle.
        // Locking the row prevents concurrent booking requests for this show
        // from passing the availability check simultaneously.
        (await import("drizzle-orm")).sql`
          SELECT id, price_in_paise
          FROM showtimes
          WHERE id = ${showtimeId}
          FOR UPDATE
        `,
      );

      const showtimeRow = lockedShowtime.rows?.[0];

      if (!showtimeRow) {
        return { error: "SHOWTIME_NOT_FOUND" };
      }

      const [showtime] = await tx
        .select({
          id: showtimes.id,
          screenId: showtimes.screenId,
          priceInPaise: showtimes.priceInPaise,
        })
        .from(showtimes)
        .where(eq(showtimes.id, showtimeId))
        .limit(1);

      const selectedSeats = await tx
        .select({
          id: seats.id,
          screenId: seats.screenId,
        })
        .from(seats)
        .where(inArray(seats.id, seatIds));

      if (selectedSeats.length !== seatIds.length) {
        return { error: "INVALID_SEATS" };
      }

      if (selectedSeats.some((seat) => seat.screenId !== showtime.screenId)) {
        return { error: "SEAT_SCREEN_MISMATCH" };
      }

      const existingReservations = await tx
        .select({ seatId: bookingSeats.seatId })
        .from(bookingSeats)
        .where(
          and(
            eq(bookingSeats.showtimeId, showtimeId),
            inArray(bookingSeats.seatId, seatIds),
          ),
        );

      if (existingReservations.length > 0) {
        return { error: "SEATS_UNAVAILABLE" };
      }

      const totalAmountInPaise = showtime.priceInPaise * seatIds.length;

      if (
        !Number.isSafeInteger(totalAmountInPaise) ||
        totalAmountInPaise > 2_147_483_647
      ) {
        return { error: "TOTAL_AMOUNT_OUT_OF_RANGE" };
      }

      const [booking] = await tx
        .insert(bookings)
        .values({
          userId,
          showtimeId,
          totalAmountInPaise,
        })
        .returning();

      const reservedSeats = await tx
        .insert(bookingSeats)
        .values(
          seatIds.map((seatId) => ({
            bookingId: booking.id,
            showtimeId,
            seatId,
            priceInPaise: showtime.priceInPaise,
          })),
        )
        .returning();

      return {
        booking,
        seats: reservedSeats,
      };
    });

    if (result.error === "SHOWTIME_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Showtime not found.",
      });
    }

    if (result.error === "TOTAL_AMOUNT_OUT_OF_RANGE") {
      return res.status(400).json({
        success: false,
        message: "Booking total exceeds the supported amount limit.",
      });
    }

    if (result.error === "INVALID_SEATS") {
      return res.status(400).json({
        success: false,
        message: "One or more seat IDs are invalid.",
      });
    }

    if (result.error === "SEAT_SCREEN_MISMATCH") {
      return res.status(400).json({
        success: false,
        message: "Selected seats do not belong to this show's screen.",
      });
    }

    if (result.error === "SEATS_UNAVAILABLE") {
      return res.status(409).json({
        success: false,
        message: "One or more selected seats are already booked.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      booking: result.booking,
      seats: result.seats,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "One or more selected seats are already booked.",
      });
    }

    next(error);
  }
}
