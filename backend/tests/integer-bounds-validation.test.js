import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  createMovieSchema,
  listMoviesQuerySchema,
} from "../src/validators/movie.validator.js";
import { createScreenSchema } from "../src/validators/screen.validator.js";
import {
  createShowtimeSchema,
  listShowtimesQuerySchema,
} from "../src/validators/showtime.validator.js";
import { listCinemasQuerySchema } from "../src/validators/cinema.validator.js";
import { getCinemas } from "../src/controllers/cinema.controller.js";
import { db } from "../src/db/index.js";

describe("PostgreSQL Integer Bounds Validation", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  describe("Movie durationMinutes validation (createMovieSchema)", () => {
    const validBaseMovie = {
      title: "Inception",
      durationMinutes: 148,
      language: "English",
    };

    it("accepts valid boundary values (1, 120, 1000)", () => {
      assert.equal(
        createMovieSchema.safeParse({ ...validBaseMovie, durationMinutes: 1 })
          .success,
        true,
      );
      assert.equal(
        createMovieSchema.safeParse({ ...validBaseMovie, durationMinutes: 120 })
          .success,
        true,
      );
      assert.equal(
        createMovieSchema.safeParse({ ...validBaseMovie, durationMinutes: 1000 })
          .success,
        true,
      );
    });

    it("rejects values exceeding the 1,000 minute business maximum", () => {
      const overMax = createMovieSchema.safeParse({
        ...validBaseMovie,
        durationMinutes: 1001,
      });
      assert.equal(overMax.success, false);
      assert.ok(
        overMax.error.issues.some((i) => i.path.includes("durationMinutes")),
      );

      const pgIntMax = createMovieSchema.safeParse({
        ...validBaseMovie,
        durationMinutes: 2_147_483_647,
      });
      assert.equal(pgIntMax.success, false);

      const pgIntOverflow = createMovieSchema.safeParse({
        ...validBaseMovie,
        durationMinutes: 2_147_483_648,
      });
      assert.equal(pgIntOverflow.success, false);
    });

    it("rejects zero, negative, fractional, and non-integer values", () => {
      const zero = createMovieSchema.safeParse({
        ...validBaseMovie,
        durationMinutes: 0,
      });
      assert.equal(zero.success, false);

      const negative = createMovieSchema.safeParse({
        ...validBaseMovie,
        durationMinutes: -1,
      });
      assert.equal(negative.success, false);

      const negativePgMin = createMovieSchema.safeParse({
        ...validBaseMovie,
        durationMinutes: -2_147_483_648,
      });
      assert.equal(negativePgMin.success, false);

      const fractional = createMovieSchema.safeParse({
        ...validBaseMovie,
        durationMinutes: 120.5,
      });
      assert.equal(fractional.success, false);

      const stringValue = createMovieSchema.safeParse({
        ...validBaseMovie,
        durationMinutes: "120",
      });
      assert.equal(stringValue.success, false);
    });

    it("enforces integer bounds on listMoviesQuerySchema pagination", () => {
      const validPage = listMoviesQuerySchema.safeParse({ page: 1, limit: 20 });
      assert.equal(validPage.success, true);

      const maxPgPage = listMoviesQuerySchema.safeParse({
        page: 2_147_483_647,
      });
      assert.equal(maxPgPage.success, true);

      const overflowPage = listMoviesQuerySchema.safeParse({
        page: 2_147_483_648,
      });
      assert.equal(overflowPage.success, false);

      const zeroPage = listMoviesQuerySchema.safeParse({ page: 0 });
      assert.equal(zeroPage.success, false);
    });
  });

  describe("Screen totalSeats validation (createScreenSchema)", () => {
    const validBaseScreen = {
      cinemaId: "33333333-3333-4333-8333-333333333333",
      name: "Screen 1",
      totalSeats: 150,
    };

    it("accepts valid boundary values (1, 150, 1000)", () => {
      assert.equal(
        createScreenSchema.safeParse({ ...validBaseScreen, totalSeats: 1 })
          .success,
        true,
      );
      assert.equal(
        createScreenSchema.safeParse({ ...validBaseScreen, totalSeats: 150 })
          .success,
        true,
      );
      assert.equal(
        createScreenSchema.safeParse({ ...validBaseScreen, totalSeats: 1000 })
          .success,
        true,
      );
    });

    it("rejects values exceeding the 1,000 seat business maximum", () => {
      const overMax = createScreenSchema.safeParse({
        ...validBaseScreen,
        totalSeats: 1001,
      });
      assert.equal(overMax.success, false);
      assert.ok(
        overMax.error.issues.some((i) => i.path.includes("totalSeats")),
      );

      const pgIntMax = createScreenSchema.safeParse({
        ...validBaseScreen,
        totalSeats: 2_147_483_647,
      });
      assert.equal(pgIntMax.success, false);

      const pgIntOverflow = createScreenSchema.safeParse({
        ...validBaseScreen,
        totalSeats: 2_147_483_648,
      });
      assert.equal(pgIntOverflow.success, false);
    });

    it("rejects zero, negative, fractional, and non-integer values", () => {
      const zero = createScreenSchema.safeParse({
        ...validBaseScreen,
        totalSeats: 0,
      });
      assert.equal(zero.success, false);

      const negative = createScreenSchema.safeParse({
        ...validBaseScreen,
        totalSeats: -1,
      });
      assert.equal(negative.success, false);

      const fractional = createScreenSchema.safeParse({
        ...validBaseScreen,
        totalSeats: 100.5,
      });
      assert.equal(fractional.success, false);

      const stringValue = createScreenSchema.safeParse({
        ...validBaseScreen,
        totalSeats: "150",
      });
      assert.equal(stringValue.success, false);
    });
  });

  describe("Showtime priceInPaise validation (createShowtimeSchema)", () => {
    const validBaseShowtime = {
      movieId: "44444444-4444-4444-8444-444444444444",
      screenId: "55555555-5555-4555-8555-555555555555",
      startsAt: "2026-10-22T10:00:00.000Z",
      endsAt: "2026-10-22T12:30:00.000Z",
      priceInPaise: 25000,
    };

    it("accepts valid boundary values (0, 25000, 10000000)", () => {
      // 0 paise for promotional/free screenings
      assert.equal(
        createShowtimeSchema.safeParse({
          ...validBaseShowtime,
          priceInPaise: 0,
        }).success,
        true,
      );
      // 25,000 paise (₹250.00) standard ticket
      assert.equal(
        createShowtimeSchema.safeParse({
          ...validBaseShowtime,
          priceInPaise: 25000,
        }).success,
        true,
      );
      // 10,000,000 paise (₹100,000.00) maximum upper bound
      assert.equal(
        createShowtimeSchema.safeParse({
          ...validBaseShowtime,
          priceInPaise: 10_000_000,
        }).success,
        true,
      );
    });

    it("rejects ticket prices exceeding 10,000,000 paise (₹100,000)", () => {
      const overMax = createShowtimeSchema.safeParse({
        ...validBaseShowtime,
        priceInPaise: 10_000_001,
      });
      assert.equal(overMax.success, false);
      assert.ok(
        overMax.error.issues.some((i) => i.path.includes("priceInPaise")),
      );

      const pgIntMax = createShowtimeSchema.safeParse({
        ...validBaseShowtime,
        priceInPaise: 2_147_483_647,
      });
      assert.equal(pgIntMax.success, false);

      const pgIntOverflow = createShowtimeSchema.safeParse({
        ...validBaseShowtime,
        priceInPaise: 2_147_483_648,
      });
      assert.equal(pgIntOverflow.success, false);
    });

    it("rejects negative, fractional, and non-integer values", () => {
      const negative = createShowtimeSchema.safeParse({
        ...validBaseShowtime,
        priceInPaise: -1,
      });
      assert.equal(negative.success, false);

      const fractional = createShowtimeSchema.safeParse({
        ...validBaseShowtime,
        priceInPaise: 25000.5,
      });
      assert.equal(fractional.success, false);

      const stringValue = createShowtimeSchema.safeParse({
        ...validBaseShowtime,
        priceInPaise: "25000",
      });
      assert.equal(stringValue.success, false);
    });

    it("enforces integer bounds on listShowtimesQuerySchema pagination", () => {
      const valid = listShowtimesQuerySchema.safeParse({ page: 1, limit: 10 });
      assert.equal(valid.success, true);

      const maxPgPage = listShowtimesQuerySchema.safeParse({
        page: 2_147_483_647,
      });
      assert.equal(maxPgPage.success, true);

      const overflowPage = listShowtimesQuerySchema.safeParse({
        page: 2_147_483_648,
      });
      assert.equal(overflowPage.success, false);

      const zeroPage = listShowtimesQuerySchema.safeParse({ page: 0 });
      assert.equal(zeroPage.success, false);
    });
  });

  describe("Cinema pagination and query validation (listCinemasQuerySchema)", () => {
    it("uses default page (1) and limit (10) when query parameters are omitted", () => {
      const parsed = listCinemasQuerySchema.safeParse({});
      assert.equal(parsed.success, true);
      assert.equal(parsed.data.page, 1);
      assert.equal(parsed.data.limit, 10);
      assert.equal(parsed.data.city, undefined);
    });

    it("accepts valid boundary values and coerces string query parameters", () => {
      const minBounds = listCinemasQuerySchema.safeParse({ page: 1, limit: 1 });
      assert.equal(minBounds.success, true);
      assert.equal(minBounds.data.page, 1);
      assert.equal(minBounds.data.limit, 1);

      const maxLimit = listCinemasQuerySchema.safeParse({ page: 1, limit: 50 });
      assert.equal(maxLimit.success, true);
      assert.equal(maxLimit.data.limit, 50);

      const maxPgPage = listCinemasQuerySchema.safeParse({
        page: 2_147_483_647,
        limit: 50,
      });
      assert.equal(maxPgPage.success, true);
      assert.equal(maxPgPage.data.page, 2_147_483_647);

      const stringCoerced = listCinemasQuerySchema.safeParse({
        page: "5",
        limit: "25",
        city: "Mumbai",
      });
      assert.equal(stringCoerced.success, true);
      assert.equal(stringCoerced.data.page, 5);
      assert.equal(stringCoerced.data.limit, 25);
      assert.equal(stringCoerced.data.city, "Mumbai");
    });

    it("rejects zero, negative, fractional, malformed, and excessive page and limit values", () => {
      // Zero
      assert.equal(listCinemasQuerySchema.safeParse({ page: 0 }).success, false);
      assert.equal(listCinemasQuerySchema.safeParse({ limit: 0 }).success, false);
      assert.equal(
        listCinemasQuerySchema.safeParse({ page: "0", limit: "0" }).success,
        false,
      );

      // Negative
      assert.equal(listCinemasQuerySchema.safeParse({ page: -1 }).success, false);
      assert.equal(listCinemasQuerySchema.safeParse({ limit: -1 }).success, false);
      assert.equal(
        listCinemasQuerySchema.safeParse({ page: "-5" }).success,
        false,
      );

      // Fractional
      assert.equal(listCinemasQuerySchema.safeParse({ page: 1.5 }).success, false);
      assert.equal(listCinemasQuerySchema.safeParse({ limit: 10.2 }).success, false);
      assert.equal(
        listCinemasQuerySchema.safeParse({ page: "2.5" }).success,
        false,
      );

      // Malformed / NaN
      assert.equal(
        listCinemasQuerySchema.safeParse({ page: "abc" }).success,
        false,
      );
      assert.equal(
        listCinemasQuerySchema.safeParse({ limit: "xyz" }).success,
        false,
      );
      assert.equal(listCinemasQuerySchema.safeParse({ page: "" }).success, false);
      assert.equal(listCinemasQuerySchema.safeParse({ limit: "" }).success, false);

      // Excessive values
      const overflowPage = listCinemasQuerySchema.safeParse({
        page: 2_147_483_648,
      });
      assert.equal(overflowPage.success, false);

      const overMaxLimit = listCinemasQuerySchema.safeParse({ limit: 51 });
      assert.equal(overMaxLimit.success, false);

      const hugeExponent = listCinemasQuerySchema.safeParse({ page: "1e25" });
      assert.equal(hugeExponent.success, false);
    });

    it("validates city filter for omitted, empty, whitespace-only, and valid values", () => {
      // Omitted city
      const omitted = listCinemasQuerySchema.safeParse({});
      assert.equal(omitted.success, true);
      assert.equal(omitted.data.city, undefined);

      // Empty city
      const emptyCity = listCinemasQuerySchema.safeParse({ city: "" });
      assert.equal(emptyCity.success, true);
      assert.equal(emptyCity.data.city, "");

      // Whitespace-only city trims to empty string
      const whitespaceCity = listCinemasQuerySchema.safeParse({ city: "   " });
      assert.equal(whitespaceCity.success, true);
      assert.equal(whitespaceCity.data.city, "");

      // Valid city
      const validCity = listCinemasQuerySchema.safeParse({ city: "Mumbai" });
      assert.equal(validCity.success, true);
      assert.equal(validCity.data.city, "Mumbai");

      // Valid city with surrounding whitespace is trimmed
      const trimmedCity = listCinemasQuerySchema.safeParse({
        city: "  New Delhi  ",
      });
      assert.equal(trimmedCity.success, true);
      assert.equal(trimmedCity.data.city, "New Delhi");

      // City exceeding 100 characters is rejected
      const tooLongCity = listCinemasQuerySchema.safeParse({
        city: "a".repeat(101),
      });
      assert.equal(tooLongCity.success, false);
    });
  });

  describe("Cinema list controller response contract (getCinemas)", () => {
    it("returns 400 with standard validation error structure on invalid query parameters", async () => {
      let statusCode;
      let jsonBody;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await getCinemas({ query: { page: "0", limit: "100" } }, res, () => {});

      assert.equal(statusCode, 400);
      assert.equal(jsonBody.success, false);
      assert.equal(jsonBody.message, "Invalid query parameters");
      assert.ok(Array.isArray(jsonBody.errors));
      assert.ok(jsonBody.errors.length >= 1);
    });

    it("does not create an empty-string city filter when city is omitted, empty, or whitespace-only", async () => {
      const testQueries = [
        {},
        { city: "" },
        { city: "   " },
      ];

      for (const query of testQueries) {
        let capturedWhereClause;
        mock.method(db, "select", () => ({
          from: () => ({
            where: (whereClause) => {
              capturedWhereClause = whereClause;
              return {
                orderBy: () => ({
                  limit: () => ({
                    offset: async () => [],
                  }),
                }),
              };
            },
          }),
        }));

        const res = {
          status() {
            return this;
          },
          json() {
            return this;
          },
        };

        await getCinemas({ query }, res, () => {});

        assert.equal(
          capturedWhereClause,
          undefined,
          `Expected undefined whereClause for query ${JSON.stringify(query)}, got ${capturedWhereClause}`,
        );

        mock.restoreAll();
      }
    });

    it("applies city filter when a valid city name is provided", async () => {
      let capturedWhereClause;
      mock.method(db, "select", () => ({
        from: () => ({
          where: (whereClause) => {
            capturedWhereClause = whereClause;
            return {
              orderBy: () => ({
                limit: () => ({
                  offset: async () => [],
                }),
              }),
            };
          },
        }),
      }));

      const res = {
        status() {
          return this;
        },
        json() {
          return this;
        },
      };

      await getCinemas({ query: { city: "  Mumbai  " } }, res, () => {});

      assert.notEqual(
        capturedWhereClause,
        undefined,
        "Expected defined whereClause for valid city filter",
      );

      mock.restoreAll();
    });

    it("returns 200 with standard pagination response when query parameters are valid", async () => {
      const mockRows = [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "PVR Cinemas",
          address: "Connaught Place",
          city: "New Delhi",
          state: "Delhi",
          postalCode: "110001",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          updatedAt: new Date("2026-01-01T00:00:00Z"),
        },
      ];

      let selectCallCount = 0;
      mock.method(db, "select", () => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => ({
                    offset: async () => mockRows,
                  }),
                }),
              }),
            }),
          };
        }
        return {
          from: () => ({
            where: async () => [{ total: 1 }],
          }),
        };
      });

      let statusCode;
      let jsonBody;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await getCinemas({ query: { page: "1", limit: "10" } }, res, () => {});

      assert.equal(statusCode, 200);
      assert.equal(jsonBody.success, true);
      assert.deepEqual(jsonBody.pagination, {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      assert.equal(jsonBody.count, 1);
      assert.equal(jsonBody.cinemas.length, 1);
      assert.equal(jsonBody.cinemas[0].name, "PVR Cinemas");
    });
  });
});
