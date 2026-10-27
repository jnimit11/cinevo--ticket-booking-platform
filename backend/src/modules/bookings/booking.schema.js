import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  timestamp,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { users } from "../auth/auth.schema.js";
import { showtimes } from "../showtimes/showtime.schema.js";
import { seats } from "../screens/screen.schema.js";

export const bookingStatusEnum = pgEnum("booking_status", [
  "confirmed",
  "cancelled",
]);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    showtimeId: uuid("showtime_id")
      .notNull()
      .references(() => showtimes.id, { onDelete: "restrict" }),
    status: bookingStatusEnum("status").default("confirmed").notNull(),
    totalAmountInPaise: integer("total_amount_in_paise").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check("bookings_amount_nonnegative", sql`${table.totalAmountInPaise} >= 0`),
  ],
);

export const bookingSeats = pgTable(
  "booking_seats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    showtimeId: uuid("showtime_id")
      .notNull()
      .references(() => showtimes.id, { onDelete: "restrict" }),
    seatId: uuid("seat_id")
      .notNull()
      .references(() => seats.id, { onDelete: "restrict" }),
    priceInPaise: integer("price_in_paise").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    releasedAt: timestamp("released_at"),
  },
  (table) => [
    uniqueIndex("booking_seats_showtime_seat_active_unique")
      .on(table.showtimeId, table.seatId)
      .where(sql`${table.releasedAt} IS NULL`),
    check("booking_seats_price_nonnegative", sql`${table.priceInPaise} >= 0`),
  ],
);
