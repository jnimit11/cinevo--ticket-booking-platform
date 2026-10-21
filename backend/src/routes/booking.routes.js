import { Router } from "express";
import {
  createBooking,
  getMyBookings,
} from "../controllers/booking.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/my", authenticateToken, getMyBookings);
router.post("/", authenticateToken, createBooking);

export default router;
