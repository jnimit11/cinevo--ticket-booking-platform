import { Router } from "express";
import {
  getShowtimes,
  createShowtime,
  getShowtimeSeats,
} from "../controllers/showtime.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/require-admin.middleware.js";

const router = Router();

router.post("/", authenticateToken, requireAdmin, createShowtime);
router.get("/", getShowtimes);

router.get("/:showtimeId/seats", getShowtimeSeats);

export default router;
