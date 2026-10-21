import { Router } from "express";
import {
  cancelBooking,
  createBooking,
  getMyBookings,
} from "../controllers/booking.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/my", authenticateToken, getMyBookings);
router.patch("/:bookingId/cancel", authenticateToken, cancelBooking);
router.post("/", authenticateToken, createBooking);

export default router;
