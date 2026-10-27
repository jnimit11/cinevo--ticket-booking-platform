import { Router } from "express";
import {
  getMovies,
  createMovie,
  getMovieById,
  deleteMovie,
} from "./movie.controller.js";
import { authenticateToken, requireAdmin } from "../auth/auth.middleware.js";

const router = Router();

router.get("/", getMovies);
router.get("/:id", getMovieById);
router.post("/", authenticateToken, requireAdmin, createMovie);
router.delete("/:id", authenticateToken, requireAdmin, deleteMovie);

export default router;

