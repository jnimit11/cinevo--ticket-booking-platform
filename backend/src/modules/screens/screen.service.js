import { eq } from "drizzle-orm";
import { db } from "../../core/db/client.js";
import { cinemas } from "../cinemas/cinema.schema.js";
import { screens, seats } from "./screen.schema.js";

export async function insertScreen({ cinemaId, name, totalSeats }) {
  const [cinema] = await db
    .select({ id: cinemas.id })
    .from(cinemas)
    .where(eq(cinemas.id, cinemaId))
    .limit(1);

  if (!cinema) {
    return { notFound: true, message: "Cinema not found" };
  }

  const [screen] = await db
    .insert(screens)
    .values({ cinemaId, name, totalSeats })
    .returning();

  return { screen };
}

export async function generateSeatsForScreen(screenId, { rows, seatsPerRow, seatType }) {
  const [screen] = await db
    .select()
    .from(screens)
    .where(eq(screens.id, screenId))
    .limit(1);

  if (!screen) {
    return { notFound: true, message: "Screen not found." };
  }

  const totalToGenerate = rows * seatsPerRow;

  if (totalToGenerate > screen.totalSeats) {
    return {
      invalidCapacity: true,
      message: `This screen supports at most ${screen.totalSeats} seats.`,
    };
  }

  const existingSeats = await db
    .select({ id: seats.id })
    .from(seats)
    .where(eq(seats.screenId, screenId))
    .limit(1);

  if (existingSeats.length > 0) {
    return {
      conflict: true,
      message: "Seats already exist for this screen.",
    };
  }

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

  const createdSeats = await db.transaction(async (tx) => {
    return tx.insert(seats).values(seatRecords).returning();
  });

  return {
    screenId,
    rows,
    seatsPerRow,
    totalSeats: createdSeats.length,
    seats: createdSeats,
  };
}
