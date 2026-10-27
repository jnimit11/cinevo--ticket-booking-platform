import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  integer,
  timestamp,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { movies } from "../movies/movie.schema.js";
import { screens } from "../screens/screen.schema.js";

export const showtimes = pgTable(
  "showtimes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "restrict" }),
    screenId: uuid("screen_id")
      .notNull()
      .references(() => screens.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    priceInPaise: integer("price_in_paise").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("showtimes_screen_start_unique").on(
      table.screenId,
      table.startsAt,
    ),
    check(
      "showtimes_end_after_start",
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
    check("showtimes_price_nonnegative", sql`${table.priceInPaise} >= 0`),
  ],
);
