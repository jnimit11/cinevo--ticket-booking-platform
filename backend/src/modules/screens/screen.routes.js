import { Router } from "express";
import { createScreen, generateSeats } from "./screen.controller.js";
import { authenticateToken, requireAdmin } from "../auth/auth.middleware.js";

const router = Router();

router.post("/", authenticateToken, requireAdmin, createScreen);
router.post(
  "/:screenId/seats/generate",
  authenticateToken,
  requireAdmin,
  generateSeats,
);

export default router;
