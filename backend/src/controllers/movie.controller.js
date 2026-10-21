import { desc, eq, ilike, and, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { movies } from "../db/schema/index.js";
import {
  createMovieSchema,
  listMoviesQuerySchema,
  movieIdSchema,
} from "../validators/movie.validator.js";
import { escapeLikePattern } from "../utils/like.js";

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
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(ilike(movies.title, `%${escapeLikePattern(search)}%`));
    }

    if (language) {
      conditions.push(eq(movies.language, language));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select()
      .from(movies)
      .where(whereClause)
      .orderBy(desc(movies.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ total: count() })
      .from(movies)
      .where(whereClause);

    const total = countResult.total;

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      count: result.length,
      movies: result,
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
    const data = validation.data;

    const [movie] = await db
      .insert(movies)
      .values({
        title: data.title,
        description: data.description,
        durationMinutes: data.durationMinutes,
        language: data.language,
        releaseDate: data.releaseDate,
        posterUrl: data.posterUrl,
      })
      .returning();

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

    const [movie] = await db
      .select()
      .from(movies)
      .where(eq(movies.id, validation.data))
      .limit(1);

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
