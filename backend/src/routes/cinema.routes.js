import { Router } from "express";
import { getCinemas, createCinema } from "../controllers/cinema.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/require-admin.middleware.js";

const router = Router();

router.get("/", getCinemas);

router.post("/", authenticateToken, requireAdmin, createCinema);

export default router;
