import { Router } from "express";
import {
  getMovies,
  createMovie,
  getMovieById,
  deleteMovie,
} from "../controllers/movie.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/require-admin.middleware.js";

const router = Router();

router.get("/", getMovies);
router.get("/:id", getMovieById);

router.post("/", authenticateToken, requireAdmin, createMovie);
router.delete("/:id", authenticateToken, requireAdmin, deleteMovie);
export default router;

