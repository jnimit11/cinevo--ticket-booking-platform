import "dotenv/config";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { pool, db } from "../src/core/db/client.js";
import { users } from "../src/modules/auth/auth.schema.js";
import { movies } from "../src/modules/movies/movie.schema.js";
import { cinemas } from "../src/modules/cinemas/cinema.schema.js";
import { screens, seats } from "../src/modules/screens/screen.schema.js";
import { showtimes } from "../src/modules/showtimes/showtime.schema.js";
import { SAMPLE_MOVIES } from "./seed-movies.js";

export async function seedAll() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Seeding is strictly forbidden in production environment (NODE_ENV=production).",
    );
  }

  console.log("🌱 [seed-all] Starting complete Cinevo platform database seed...");

  try {
    // 1. Seed Users (Admin & Standard Customer)
    console.log("👤 [seed-all] Seeding initial users...");
    const adminEmail = "admin@cinevo.luxury";
    const [existingAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (!existingAdmin) {
      const adminPasswordHash = await bcrypt.hash("Admin@12345", 12);
      await db.insert(users).values({
        name: "Concierge Director",
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: "admin",
      });
      console.log(`   ✓ Admin user created: ${adminEmail} (password: Admin@12345)`);
    } else {
      console.log(`   ℹ Admin user already exists: ${adminEmail}`);
    }

    const testUserEmail = "member@cinevo.luxury";
    const [existingMember] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, testUserEmail))
      .limit(1);

    if (!existingMember) {
      const memberPasswordHash = await bcrypt.hash("Member@12345", 12);
      await db.insert(users).values({
        name: "Julian Sterling",
        email: testUserEmail,
        passwordHash: memberPasswordHash,
        role: "user",
      });
      console.log(`   ✓ Member user created: ${testUserEmail} (password: Member@12345)`);
    } else {
      console.log(`   ℹ Member user already exists: ${testUserEmail}`);
    }

    // 2. Seed Movies
    console.log("🎬 [seed-all] Seeding movies catalogue...");
    const existingMovies = await db.select({ id: movies.id, title: movies.title }).from(movies);
    const existingMovieTitles = new Set(existingMovies.map((m) => m.title.trim().toLowerCase()));

    const moviesToInsert = SAMPLE_MOVIES.filter(
      (m) => !existingMovieTitles.has(m.title.trim().toLowerCase()),
    );

    let insertedMovies = [];
    if (moviesToInsert.length > 0) {
      insertedMovies = await db.insert(movies).values(moviesToInsert).returning();
      console.log(`   ✓ Inserted ${insertedMovies.length} new movies.`);
    } else {
      console.log(`   ℹ All ${SAMPLE_MOVIES.length} movies already exist.`);
    }

    const allMovies = await db.select().from(movies);

    // 3. Seed Cinemas
    console.log("🏛️ [seed-all] Seeding cinemas...");
    const sampleCinemas = [
      {
        name: "Cinevo Grand Palais",
        address: "140 Ocean Avenue, Luxury District",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
      },
      {
        name: "Cinevo Royal Horizon",
        address: "78 Embassy Boulevard, High Street",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
      },
    ];

    const currentCinemas = await db.select().from(cinemas);
    let activeCinemas = currentCinemas;

    if (currentCinemas.length === 0) {
      activeCinemas = await db.insert(cinemas).values(sampleCinemas).returning();
      console.log(`   ✓ Created ${activeCinemas.length} cinemas.`);
    } else {
      console.log(`   ℹ ${currentCinemas.length} cinemas already present.`);
    }

    // 4. Seed Screens & Seats
    console.log("💺 [seed-all] Seeding screens and seat matrices...");
    for (const cinema of activeCinemas) {
      const existingScreens = await db
        .select()
        .from(screens)
        .where(eq(screens.cinemaId, cinema.id));

      if (existingScreens.length === 0) {
        // Create 2 screens per cinema
        const screenData = [
          { cinemaId: cinema.id, name: "Screen 1 — Dolby Atmos", totalSeats: 120 },
          { cinemaId: cinema.id, name: "Screen 2 — IMAX Laser", totalSeats: 96 },
        ];
        const newScreens = await db.insert(screens).values(screenData).returning();

        for (const scr of newScreens) {
          const rows = scr.totalSeats === 120 ? 10 : 8;
          const seatsPerRow = 12;
          const seatRecords = [];

          for (let r = 0; r < rows; r++) {
            const rowLabel = String.fromCharCode(65 + r);
            const seatType = r < 2 ? "recliner" : r < 5 ? "premium" : "regular";

            for (let num = 1; num <= seatsPerRow; num++) {
              seatRecords.push({
                screenId: scr.id,
                rowLabel,
                seatNumber: num,
                seatType,
              });
            }
          }

          await db.insert(seats).values(seatRecords);
          console.log(`   ✓ Screen "${scr.name}" created with ${seatRecords.length} seats.`);
        }
      }
    }

    // 5. Seed Upcoming Showtimes
    console.log("🕒 [seed-all] Seeding upcoming showtimes...");
    const allScreens = await db.select().from(screens);
    const existingShowtimes = await db.select({ id: showtimes.id }).from(showtimes);

    if (existingShowtimes.length === 0 && allMovies.length > 0 && allScreens.length > 0) {
      const showtimeRecords = [];
      const now = new Date();

      // Schedule showtimes for Today, Tomorrow, and Next Day
      for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
        for (let i = 0; i < Math.min(allMovies.length, 6); i++) {
          const movie = allMovies[i];
          const screen = allScreens[i % allScreens.length];

          // 2:00 PM, 6:00 PM, 9:30 PM
          const hours = [14, 18, 21];
          const minutes = [0, 15, 30];

          for (let slot = 0; slot < 2; slot++) {
            const startsAt = new Date(now);
            startsAt.setDate(startsAt.getDate() + dayOffset);
            startsAt.setHours(hours[slot] + (i % 2), minutes[slot], 0, 0);

            const endsAt = new Date(startsAt.getTime() + (movie.durationMinutes + 30) * 60 * 1000);

            showtimeRecords.push({
              movieId: movie.id,
              screenId: screen.id,
              startsAt,
              endsAt,
              priceInPaise: (350 + (i % 3) * 50) * 100, // ₹350, ₹400, ₹450
            });
          }
        }
      }

      for (const st of showtimeRecords) {
        try {
          await db.insert(showtimes).values(st);
        } catch {
          // ignore duplicate schedule conflicts during bulk seed
        }
      }
      console.log(`   ✓ Scheduled ${showtimeRecords.length} showtimes across upcoming dates.`);
    } else {
      console.log(`   ℹ Showtimes already present (${existingShowtimes.length} total).`);
    }

    console.log("✅ [seed-all] Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ [seed-all] Seeding error:", error);
    process.exitCode = 1;
    throw error;
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("seed-all.js")) {
  seedAll().catch(() => process.exit(1));
}
