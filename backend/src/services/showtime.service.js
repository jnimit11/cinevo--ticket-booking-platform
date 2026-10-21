import { and, eq, gt, lt, sql } from "drizzle-orm";
import { showtimes } from "../db/schema/index.js";

export async function createShowtimeWithOverlapGuard(database, showtime) {
  return database.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${"cinevo.showtime:" + showtime.screenId}, 0))`,
    );

    const [conflict] = await tx
      .select({ id: showtimes.id })
      .from(showtimes)
      .where(
        and(
          eq(showtimes.screenId, showtime.screenId),
          lt(showtimes.startsAt, showtime.endsAt),
          gt(showtimes.endsAt, showtime.startsAt),
        ),
      )
      .limit(1);

    if (conflict) return { conflict: true };

    const [created] = await tx
      .insert(showtimes)
      .values(showtime)
      .returning();

    return { conflict: false, showtime: created };
  });
}
