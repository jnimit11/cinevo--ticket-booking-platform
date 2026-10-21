import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { createShowtimeWithOverlapGuard } from "../src/services/showtime.service.js";

const { Pool } = pg;
const databaseName = "cinevo_showtime_test";
const testDatabaseUrl = process.env.CINEVO_TEST_DATABASE_URL;
const schemaName = `showtime_test_${randomUUID().replaceAll("-", "")}`;
let pool;
let database;
let testDatabaseVerified = false;
let testSchemaCreated = false;

function requireIsolatedTestDatabaseUrl() {
  if (!testDatabaseUrl) {
    throw new Error(
      "Set CINEVO_TEST_DATABASE_URL to an isolated, disposable PostgreSQL database named cinevo_showtime_test.",
    );
  }

  const url = new URL(testDatabaseUrl);
  if (
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname) ||
    url.pathname.slice(1) !== databaseName
  ) {
    throw new Error(
      "Showtime concurrency tests require loopback PostgreSQL and database cinevo_showtime_test.",
    );
  }
}

before(async () => {
  requireIsolatedTestDatabaseUrl();
  pool = new Pool({ connectionString: testDatabaseUrl, max: 8 });
  const identity = await pool.query("SELECT current_database() AS database_name");
  const { database_name: actualDatabaseName } = identity.rows[0];

  if (actualDatabaseName !== databaseName) {
    throw new Error("Connected PostgreSQL database is not cinevo_showtime_test.");
  }
  testDatabaseVerified = true;

  await pool.query(`CREATE SCHEMA "${schemaName}"`);
  testSchemaCreated = true;
  await pool.query(`
    CREATE TABLE "${schemaName}".showtimes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      movie_id uuid NOT NULL,
      screen_id uuid NOT NULL,
      starts_at timestamptz NOT NULL,
      ends_at timestamptz NOT NULL,
      price_in_paise integer NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  const drizzleDatabase = drizzle({ client: pool });
  database = {
    transaction(callback) {
      return drizzleDatabase.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL search_path TO "${schemaName}"`));
        return callback(tx);
      });
    },
  };
});

beforeEach(async () => {
  if (testSchemaCreated) {
    await pool.query(`TRUNCATE TABLE "${schemaName}".showtimes`);
  }
});

after(async () => {
  if (!pool) return;
  if (testDatabaseVerified && testSchemaCreated) {
    await pool.query(`DROP SCHEMA "${schemaName}" CASCADE`);
  }
  await pool.end();
});

function sampleShowtime(screenId, startsAt, endsAt) {
  return {
    movieId: "10000000-0000-4000-8000-000000000001",
    screenId,
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    priceInPaise: 10000,
  };
}

async function createExistingShowtime(showtime) {
  await pool.query(
    `INSERT INTO "${schemaName}".showtimes (movie_id, screen_id, starts_at, ends_at, price_in_paise)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      showtime.movieId,
      showtime.screenId,
      showtime.startsAt,
      showtime.endsAt,
      showtime.priceInPaise,
    ],
  );
}

test("rejects a showtime that overlaps an existing show on the same screen", async () => {
  const screenId = "20000000-0000-4000-8000-000000000001";
  await createExistingShowtime(
    sampleShowtime(screenId, "2026-10-21T10:00:00Z", "2026-10-21T11:00:00Z"),
  );

  const result = await createShowtimeWithOverlapGuard(
    database,
    sampleShowtime(screenId, "2026-10-21T10:30:00Z", "2026-10-21T11:30:00Z"),
  );

  assert.equal(result.conflict, true);
});

test("allows at most one concurrent overlapping showtime on the same screen", async () => {
  const screenId = "20000000-0000-4000-8000-000000000002";
  const results = await Promise.all([
    createShowtimeWithOverlapGuard(
      database,
      sampleShowtime(screenId, "2026-10-21T10:00:00Z", "2026-10-21T11:00:00Z"),
    ),
    createShowtimeWithOverlapGuard(
      database,
      sampleShowtime(screenId, "2026-10-21T10:30:00Z", "2026-10-21T11:30:00Z"),
    ),
  ]);

  assert.equal(results.filter((result) => !result.conflict).length, 1);
  assert.equal(results.filter((result) => result.conflict).length, 1);
  const { rows } = await pool.query(
    `SELECT count(*)::int AS total FROM "${schemaName}".showtimes`,
  );
  assert.equal(rows[0].total, 1);
});

test("allows overlapping showtimes on different screens", async () => {
  const results = await Promise.all([
    createShowtimeWithOverlapGuard(
      database,
      sampleShowtime(
        "20000000-0000-4000-8000-000000000003",
        "2026-10-21T10:00:00Z",
        "2026-10-21T11:00:00Z",
      ),
    ),
    createShowtimeWithOverlapGuard(
      database,
      sampleShowtime(
        "20000000-0000-4000-8000-000000000004",
        "2026-10-21T10:30:00Z",
        "2026-10-21T11:30:00Z",
      ),
    ),
  ]);

  assert.deepEqual(results.map((result) => result.conflict), [false, false]);
});

test("allows adjacent showtimes on the same screen", async () => {
  const screenId = "20000000-0000-4000-8000-000000000005";
  await createExistingShowtime(
    sampleShowtime(screenId, "2026-10-21T10:00:00Z", "2026-10-21T11:00:00Z"),
  );

  const result = await createShowtimeWithOverlapGuard(
    database,
    sampleShowtime(screenId, "2026-10-21T11:00:00Z", "2026-10-21T12:00:00Z"),
  );

  assert.equal(result.conflict, false);
});
