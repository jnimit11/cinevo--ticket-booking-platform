import {
  createMovieSchema,
  listMoviesQuerySchema,
  movieIdSchema,
} from "./movie.validator.js";
import {
  fetchMovies,
  insertMovie,
  fetchMovieById,
  removeMovieById,
} from "./movie.service.js";
import { escapeLikePattern } from "../../core/utils/string.js";

export { escapeLikePattern };

export async function getMovies(req, res, next) {
  try {
    const validation = listMoviesQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.error.issues,
      });
    }

    const { page, limit, search, language } = validation.data;
    const data = await fetchMovies({ page, limit, search, language });

    return res.status(200).json({
      success: true,
      pagination: data.pagination,
      count: data.count,
      movies: data.movies,
    });
  } catch (error) {
    next(error);
  }
}

export async function createMovie(req, res, next) {
  try {
    const validation = createMovieSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie data",
        errors: validation.error.issues,
      });
    }

    const movie = await insertMovie(validation.data);

    return res.status(201).json({
      success: true,
      message: "Movie created successfully",
      movie,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMovieById(req, res, next) {
  try {
    const validation = movieIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie ID",
      });
    }

    const movie = await fetchMovieById(validation.data);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    return res.status(200).json({
      success: true,
      movie,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteMovie(req, res, next) {
  try {
    const validation = movieIdSchema.safeParse(req.params.id);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid movie ID",
        errors: validation.error.issues,
      });
    }

    const movie = await removeMovieById(validation.data);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Movie not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Movie deleted successfully",
      movie,
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({
        success: false,
        message: "Cannot delete movie because it has active showtimes. Remove scheduled showtimes first.",
      });
    }
    next(error);
  }
}

