import {
  createBookingSchema,
  bookingIdSchema,
} from "./booking.validator.js";
import {
  fetchUserBookings,
  processBookingCreation,
  processBookingCancellation,
} from "./booking.service.js";

export async function getMyBookings(req, res, next) {
  try {
    const userBookings = await fetchUserBookings(req.auth.userId);

    return res.status(200).json({
      success: true,
      bookings: userBookings,
    });
  } catch (error) {
    next(error);
  }
}

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

    const result = await processBookingCreation(userId, { showtimeId, seatIds });

    if (result.error === "DUPLICATE_SEATS_IN_REQUEST") {
      return res.status(400).json({
        success: false,
        message: "Duplicate seat IDs are not allowed.",
      });
    }

    if (result.error === "SHOWTIME_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Showtime not found.",
      });
    }

    if (result.error === "SHOWTIME_ALREADY_STARTED") {
      return res.status(400).json({
        success: false,
        message: "Cannot book seats for a screening that has already started or ended.",
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

export async function cancelBooking(req, res, next) {
  try {
    const idValidation = bookingIdSchema.safeParse(req.params.bookingId);
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format: must be a valid UUID.",
        errors: idValidation.error.issues,
      });
    }

    const bookingId = idValidation.data;
    const userId = req.auth.userId;

    const result = await processBookingCancellation(bookingId, userId);

    if (result.error === "BOOKING_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    if (result.error === "SHOWTIME_ALREADY_STARTED") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a booking for a screening that has already started or ended.",
      });
    }

    if (result.error === "BOOKING_ALREADY_CANCELLED") {
      return res.status(409).json({
        success: false,
        message: "Booking has already been cancelled.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
      booking: result.booking,
    });
  } catch (error) {
    next(error);
  }
}
