import { Router } from "express";
import {
  getMovies,
  createMovie,
  getMovieById,
} from "./movie.controller.js";
import { authenticateToken, requireAdmin } from "../auth/auth.middleware.js";

const router = Router();

router.get("/", getMovies);
router.get("/:id", getMovieById);
router.post("/", authenticateToken, requireAdmin, createMovie);

export default router;
