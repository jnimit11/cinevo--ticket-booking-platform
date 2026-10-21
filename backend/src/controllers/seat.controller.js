import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { screens, seats } from "../db/schema/index.js";
import { generateSeatsSchema } from "../validators/seat.validator.js";

const generateSeats = async (req, res, next) => {
  try {
    const { screenId } = req.params;

    const parsed = generateSeatsSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid seat generation input.",
        errors: parsed.error.issues,
      });
    }

    const { rows, seatsPerRow, seatType } = parsed.data;

    // Check that the screen exists.
    const [screen] = await db
      .select()
      .from(screens)
      .where(eq(screens.id, screenId))
      .limit(1);

    if (!screen) {
      return res.status(404).json({
        message: "Screen not found.",
      });
    }

    const totalToGenerate = rows * seatsPerRow;

    if (totalToGenerate > screen.totalSeats) {
      return res.status(400).json({
        message: `This screen supports at most ${screen.totalSeats} seats.`,
      });
    }

    // Prevent accidental duplicate generation.
    const existingSeats = await db
      .select({ id: seats.id })
      .from(seats)
      .where(eq(seats.screenId, screenId))
      .limit(1);

    if (existingSeats.length > 0) {
      return res.status(409).json({
        message: "Seats already exist for this screen.",
      });
    }

    // Generate rows A, B, C... and seat numbers 1, 2, 3...
    const seatRecords = [];

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const rowLabel = String.fromCharCode(65 + rowIndex);

      for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber++) {
        seatRecords.push({
          screenId,
          rowLabel,
          seatNumber,
          seatType,
        });
      }
    }

    // Insert all seats atomically.
    const createdSeats = await db.transaction(async (tx) => {
      return tx.insert(seats).values(seatRecords).returning();
    });

    return res.status(201).json({
      message: "Seats generated successfully.",
      screenId,
      rows,
      seatsPerRow,
      totalSeats: createdSeats.length,
      seats: createdSeats,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Duplicate seat positions detected. Please check this screen.",
      });
    }

    next(error);
  }
};

export { generateSeats };
