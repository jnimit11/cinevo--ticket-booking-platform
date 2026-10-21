CREATE TABLE "seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"screen_id" uuid NOT NULL,
	"row_label" varchar(5) NOT NULL,
	"seat_number" integer NOT NULL,
	"seat_type" varchar(20) DEFAULT 'regular' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "seats_number_positive" CHECK ("seats"."seat_number" > 0),
	CONSTRAINT "seats_type_valid" CHECK ("seats"."seat_type" IN ('regular', 'premium', 'recliner'))
);
--> statement-breakpoint
ALTER TABLE "seats" ADD CONSTRAINT "seats_screen_id_screens_id_fk" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "seats_screen_position_unique" ON "seats" USING btree ("screen_id","row_label","seat_number");