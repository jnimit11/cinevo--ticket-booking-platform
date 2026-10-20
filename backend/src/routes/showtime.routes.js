import { Router } from "express";
import {
  getShowtimes,
  createShowtime,
} from "../controllers/showtime.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/require-admin.middleware.js";

const router = Router();

router.post("/", authenticateToken, requireAdmin, createShowtime);
router.get("/", getShowtimes);

export default router;
