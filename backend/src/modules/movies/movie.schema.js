import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  date,
  timestamp,
  check,
} from "drizzle-orm/pg-core";

export const movies = pgTable(
  "movies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    language: varchar("language", { length: 50 }).notNull(),
    releaseDate: date("release_date"),
    posterUrl: text("poster_url"),
    createdAt: timestamp("created_At").defaultNow().notNull(),
    updatedAt: timestamp("updated_At").defaultNow().notNull(),
  },
  (table) => [
    check("movies_duration_positive", sql`${table.durationMinutes} > 0`),
  ],
);
