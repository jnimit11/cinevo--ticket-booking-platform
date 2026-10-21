import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  integer,
  date,
  timestamp,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: varchar("name", { length: 100 }).notNull(),

  email: varchar("email", { length: 255 }).notNull().unique(),

  passwordHash: varchar("password_hash", { length: 255 }).notNull(),

  role: userRoleEnum("role").default("user").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

export const cinemas = pgTable("cinemas", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("Name", { length: 200 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

    seatType: varchar("seat_type", { length: 20 })
      .notNull()
      .default("regular"),

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
