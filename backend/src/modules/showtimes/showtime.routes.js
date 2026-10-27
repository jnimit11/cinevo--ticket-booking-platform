import { Router } from "express";
import {
  getShowtimes,
  createShowtime,
  getShowtimeSeats,
} from "./showtime.controller.js";
import { authenticateToken, requireAdmin } from "../auth/auth.middleware.js";

const router = Router();

router.get("/", getShowtimes);
router.post("/", authenticateToken, requireAdmin, createShowtime);
router.get("/:showtimeId/seats", getShowtimeSeats);

export default router;
