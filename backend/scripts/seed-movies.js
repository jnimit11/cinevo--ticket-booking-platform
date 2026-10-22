import "dotenv/config";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { db, pool } from "../src/db/index.js";
import { movies } from "../src/db/schema/index.js";

/**
 * 16 realistic, original movie records for development and testing.
 * Conforms to createMovieSchema validation rules:
 * - title: string, 1-200 chars
 * - description: optional string
 * - durationMinutes: integer, 1-1000 (sample runtimes between 85 and 180 min)
 * - language: supported catalogue filter language, 1-50 chars
 * - releaseDate: valid ISO date string ('YYYY-MM-DD')
 * - posterUrl: valid HTTPS URL, or null for fallback layout testing
 */
export const SAMPLE_MOVIES = [
  {
    title: "Chronicles of the Solar Wind",
    description:
      "A crew of deep-space pioneers navigates an unpredictable geomagnetic storm while surveying the outer asteroid belt.",
    durationMinutes: 142,
    language: "English",
    releaseDate: "2025-03-14",
    posterUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Dastaan-e-Kashmir",
    description:
      "An evocative drama following a traditional artisan family fighting to preserve their generational carpet-weaving craft against modern industrialization.",
    durationMinutes: 135,
    language: "Hindi",
    releaseDate: "2025-01-26",
    posterUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Thalaivanin Kural",
    description:
      "An intense coastal thriller about a seasoned fishing village leader who uncovers an illicit maritime salvage operation.",
    durationMinutes: 150,
    language: "Tamil",
    releaseDate: "2025-04-14",
    posterUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Vijayanagara",
    description:
      "A sweeping historical epic recounting the rise of a visionary architect tasked with building a sanctuary within an ancient Deccan empire.",
    durationMinutes: 168,
    language: "Telugu",
    releaseDate: "2025-05-02",
    posterUrl:
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Shadows in the Mist",
    description:
      "A quiet neo-noir detective mystery set in a fog-drenched mountain town where a reclusive botanist holds the key to an unsolved disappearance.",
    durationMinutes: 118,
    language: "English",
    releaseDate: "2025-02-21",
    posterUrl:
      "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Nizhalukal",
    description:
      "A psychological drama tracking a rural schoolteacher whose family heritage becomes intertwined with an ancient rainforest folk mystery.",
    durationMinutes: 128,
    language: "Malayalam",
    releaseDate: "2025-06-18",
    posterUrl:
      "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Midnight Symphony",
    description:
      "Two estranged classical prodigies reunite on the rooftops of Vienna to compose a final concert before their historic hall closes forever.",
    durationMinutes: 104,
    language: "French",
    releaseDate: "2025-07-04",
    posterUrl:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Neon Horizon: Tokyo 2088",
    description:
      "An animated cyberpunk adventure centering on an underground data courier race across subterranean magnetic transit lines.",
    durationMinutes: 98,
    language: "Japanese",
    releaseDate: "2025-08-15",
    posterUrl:
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "The Silk Trail",
    description:
      "A documentary-style adventure following an archaeologist searching for lost trading outposts along rugged mountain valleys.",
    durationMinutes: 95,
    language: "English",
    releaseDate: "2025-09-10",
    posterUrl: null, // Exercising frontend poster fallback
  },
  {
    title: "Ganga Kinare",
    description:
      "A heartwarming multi-generational family dramedy centered around a riverside teashop celebrating its golden jubilee year.",
    durationMinutes: 122,
    language: "Hindi",
    releaseDate: "2025-10-02",
    posterUrl:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "El Último Faro",
    description:
      "A seasoned lighthouse keeper on a windswept Iberian headland discovers a mysterious distress beacon coming from deep under the sea.",
    durationMinutes: 112,
    language: "Spanish",
    releaseDate: "2025-11-20",
    posterUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Bengal Melody",
    description:
      "A poetic journey through Kolkata's monsoon streets celebrating a street violinist who unites a fractured neighborhood through music.",
    durationMinutes: 115,
    language: "Bengali",
    releaseDate: "2025-12-12",
    posterUrl:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Sahyadri Chhaaya",
    description:
      "An adventurous expedition follows conservationists tracking an elusive leopard pack across the rugged Western Ghats.",
    durationMinutes: 108,
    language: "Marathi",
    releaseDate: "2026-01-15",
    posterUrl:
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Seoul Beats",
    description:
      "An ambitious young sound engineer teams up with traditional percussionists to create a groundbreaking fusion album.",
    durationMinutes: 105,
    language: "Korean",
    releaseDate: "2026-02-14",
    posterUrl:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80",
  },
  {
    title: "Karavali Kogile",
    description:
      "An uplifting musical drama following a coastal folk singer discovering her voice on a national stage while staying true to her roots.",
    durationMinutes: 125,
    language: "Kannada",
    releaseDate: "2026-03-01",
    posterUrl: null, // Exercising frontend poster fallback
  },
  {
    title: "The Velocity Code",
    description:
      "A high-octane racing drama following an aerodynamics engineer who tests a sustainable hydrogen supercar on the world's toughest circuits.",
    durationMinutes: 119,
    language: "English",
    releaseDate: "2026-04-10",
    posterUrl:
      "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80",
  },
];

/**
 * Seeds the movies table idempotently without truncating or overwriting existing records.
 *
 * NOTE: The PostgreSQL database schema does NOT define a UNIQUE constraint on movie titles.
 * Deduplication is performed at the application layer by matching trimmed, case-insensitive
 * titles against existing database records. While safe for repeatable single-run developer
 * seeding, this does not guarantee database-enforced uniqueness against concurrent runs.
 */
export async function seedMovies() {
  try {
    const existingRecords = await db
      .select({ title: movies.title })
      .from(movies);

    const existingTitleSet = new Set(
      existingRecords.map((record) => record.title.trim().toLowerCase()),
    );

    const moviesToInsert = SAMPLE_MOVIES.filter(
      (candidate) => !existingTitleSet.has(candidate.title.trim().toLowerCase()),
    );

    const skippedCount = SAMPLE_MOVIES.length - moviesToInsert.length;

    if (moviesToInsert.length === 0) {
      console.log(
        `[seed-movies] No new movies to insert. All ${SAMPLE_MOVIES.length} sample movies already exist in the database (${skippedCount} skipped).`,
      );
      return {
        insertedCount: 0,
        skippedCount,
        totalCandidates: SAMPLE_MOVIES.length,
      };
    }

    const inserted = await db
      .insert(movies)
      .values(moviesToInsert)
      .returning({ id: movies.id, title: movies.title });

    console.log(
      `[seed-movies] Successfully inserted ${inserted.length} movies (${skippedCount} skipped as already present). Total candidates: ${SAMPLE_MOVIES.length}.`,
    );

    return {
      insertedCount: inserted.length,
      skippedCount,
      totalCandidates: SAMPLE_MOVIES.length,
    };
  } catch (error) {
    console.error("[seed-movies] Error during movie seeding:", error.message || error);
    process.exitCode = 1;
    throw error;
  } finally {
    await pool.end();
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  seedMovies().catch(() => {
    process.exit(1);
  });
}
