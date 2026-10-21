import { Router } from "express";
import { createBooking } from "../controllers/booking.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticateToken, createBooking);

export default router;
