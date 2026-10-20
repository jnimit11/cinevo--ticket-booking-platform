import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { cinemas, screens } from "../db/schema/index.js";
import { createScreenSchema } from "../validators/screen.validator.js";

export async function createScreen(req, res, next) {
  try {
    const validation = createScreenSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid screen data",
        errors: validation.error.issues,
      });
    }
    const { cinemaId, name, totalSeats } = validation.data;

    const [cinema] = await db
      .select({ id: cinemas.id })
      .from(cinemas)
      .where(eq(cinemas.id, cinemaId))
      .limit(1);

    if (!cinema) {
      return res.status(404).json({
        success: false,
        message: "Cinema not found",
      });
    }
    const [screen] = await db
      .insert(screens)
      .values({ cinemaId, name, totalSeats })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Screen created successfully",
      screen,
    });
  } catch (error) {
    next(error);
  }
}
