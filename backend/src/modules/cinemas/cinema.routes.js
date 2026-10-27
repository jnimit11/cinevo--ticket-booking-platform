import { Router } from "express";
import { getCinemas, createCinema } from "./cinema.controller.js";
import { authenticateToken, requireAdmin } from "../auth/auth.middleware.js";

const router = Router();

router.get("/", getCinemas);
router.post("/", authenticateToken, requireAdmin, createCinema);

export default router;
