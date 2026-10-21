import { Router } from "express";
import { createScreen } from "../controllers/screen.controller.js";
import { generateSeats } from "../controllers/seat.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/require-admin.middleware.js";

const router = Router();

router.post("/", authenticateToken, requireAdmin, createScreen);

router.post(
  "/:screenId/seats/generate",
  authenticateToken,
  requireAdmin,
  generateSeats,
);

export default router;
