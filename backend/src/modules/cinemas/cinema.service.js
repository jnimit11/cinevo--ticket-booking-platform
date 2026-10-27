import { desc, eq, count } from "drizzle-orm";
import { db } from "../../core/db/client.js";
import { cinemas } from "./cinema.schema.js";

export async function fetchCinemas({ page, limit, city }) {
  const offset = (page - 1) * limit;
  const whereClause = city ? eq(cinemas.city, city) : undefined;

  const result = await db
    .select()
    .from(cinemas)
    .where(whereClause)
    .orderBy(desc(cinemas.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ total: count() })
    .from(cinemas)
    .where(whereClause);

  const total = Number(countResult.total);

  return {
    cinemas: result,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    count: result.length,
  };
}

export async function insertCinema(data) {
  const [cinema] = await db
    .insert(cinemas)
    .values(data)
    .returning();

  return cinema;
}
