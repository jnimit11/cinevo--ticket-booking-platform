DROP INDEX "booking_seats_showtime_seat_unique";--> statement-breakpoint
ALTER TABLE "booking_seats" ADD COLUMN "released_at" timestamp;--> statement-breakpoint
UPDATE "booking_seats"
SET "released_at" = "bookings"."updated_at"
FROM "bookings"
WHERE "booking_seats"."booking_id" = "bookings"."id"
	AND "bookings"."status" = 'cancelled'
	AND "booking_seats"."released_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_seats_showtime_seat_active_unique" ON "booking_seats" USING btree ("showtime_id","seat_id") WHERE "booking_seats"."released_at" IS NULL;