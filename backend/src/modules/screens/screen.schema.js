import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { cinemas } from "../cinemas/cinema.schema.js";

export const screens = pgTable(
  "screens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cinemaId: uuid("cinema_id")
      .notNull()
      .references(() => cinemas.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    totalSeats: integer("total_seats").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("screens_cinema_name_unique").on(table.cinemaId, table.name),
    check("screens_total_seats_positive", sql`${table.totalSeats} > 0`),
  ],
);

export const seats = pgTable(
  "seats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    screenId: uuid("screen_id")
      .notNull()
      .references(() => screens.id, { onDelete: "cascade" }),
    rowLabel: varchar("row_label", { length: 5 }).notNull(),
    seatNumber: integer("seat_number").notNull(),
    seatType: varchar("seat_type", { length: 20 }).notNull().default("regular"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("seats_screen_position_unique").on(
      table.screenId,
      table.rowLabel,
      table.seatNumber,
    ),
    check("seats_number_positive", sql`${table.seatNumber} > 0`),
    check(
      "seats_type_valid",
      sql`${table.seatType} IN ('regular', 'premium', 'recliner')`,
    ),
  ],
);
