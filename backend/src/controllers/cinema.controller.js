import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { cinemas } from "../db/schema/index.js";
import { createCinemaSchema } from "../validators/cinema.validator.js";

export async function getCinemas(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    const city =
      typeof req.query.city === "string" ? req.query.city.trim() : "";

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

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      count: result.length,
      cinemas: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCinema(req, res, next) {
  try {
    const validation = createCinemaSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid cinema data",
        errors: validation.error.issues,
      });
    }

    const [cinema] = await db
      .insert(cinemas)
      .values(validation.data)
      .returning();

    return res.status(201).json({
      success: true,
      message: "Cinema created successfully",
      cinema,
    });
  } catch (error) {
    next(error);
  }
}
