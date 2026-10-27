import { desc, eq, ilike, and, count } from "drizzle-orm";
import { db } from "../../core/db/client.js";
import { movies } from "./movie.schema.js";
import { escapeLikePattern } from "../../core/utils/string.js";

export async function fetchMovies({ page, limit, search, language }) {
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

  const total = Number(countResult.total);

  return {
    movies: result,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    count: result.length,
  };
}

export async function insertMovie(data) {
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

  return movie;
}

export async function fetchMovieById(id) {
  const [movie] = await db
    .select()
    .from(movies)
    .where(eq(movies.id, id))
    .limit(1);

  return movie || null;
}
