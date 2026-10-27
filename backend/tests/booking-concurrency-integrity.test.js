import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { createBooking } from "../src/controllers/booking.controller.js";
import { db } from "../src/db/index.js";

describe("Booking Concurrency & Integrity Guard", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  function createMockRes() {
    let statusCode = 200;
    let responseBody = null;
    return {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
      getStatusCode: () => statusCode,
      getBody: () => responseBody,
    };
  }

  const validUserId = "10000000-0000-4000-8000-000000000001";
  const validShowtimeId = "20000000-0000-4000-8000-000000000001";
  const validScreenId = "30000000-0000-4000-8000-000000000001";
  const seatId1 = "40000000-0000-4000-8000-000000000001";
  const seatId2 = "40000000-0000-4000-8000-000000000002";

  describe("Intra-request duplicate seat rejection", () => {
    it("rejects booking requests containing repeated seat IDs with HTTP 400", async () => {
      const req = {
        auth: { userId: validUserId },
        body: {
          showtimeId: validShowtimeId,
          seatIds: [seatId1, seatId1],
        },
      };
      const res = createMockRes();
      let nextCalled = false;

      await createBooking(req, res, () => {
        nextCalled = true;
      });

      assert.equal(res.getStatusCode(), 400);
      assert.equal(res.getBody().success, false);
      assert.equal(
        res.getBody().message,
        "Duplicate seat IDs are not allowed.",
      );
      assert.equal(nextCalled, false);
    });
  });

  describe("In-transaction seat availability revalidation & locking", () => {
    it("returns HTTP 409 when concurrent check detects already reserved seats", async () => {
      let lockedQueryExecuted = false;

      mock.method(db, "transaction", async (callback) => {
        const mockTx = {
          execute: async (query) => {
            lockedQueryExecuted = true;
            return { rows: [{ id: validShowtimeId, price_in_paise: 25000 }] };
          },
          select: () => ({
            from: () => ({
              where: (clause) => ({
                limit: async () => [
                  {
                    id: validShowtimeId,
                    screenId: validScreenId,
                    priceInPaise: 25000,
                  },
                ],
              }),
            }),
          }),
        };

        // Custom sequential behavior for queries inside the transaction
        let queryStep = 0;
        mockTx.select = () => ({
          from: () => ({
            where: () => {
              queryStep++;
              if (queryStep === 1) {
                // Showtime lookup
                return {
                  limit: async () => [
                    {
                      id: validShowtimeId,
                      screenId: validScreenId,
                      priceInPaise: 25000,
                    },
                  ],
                };
              }
              if (queryStep === 2) {
                // Physical seats verification
                return Promise.resolve([
                  { id: seatId1, screenId: validScreenId },
                  { id: seatId2, screenId: validScreenId },
                ]);
              }
              if (queryStep === 3) {
                // In-transaction existing active reservations check -> simulates concurrent booking detected
                return Promise.resolve([{ seatId: seatId1 }]);
              }
              return Promise.resolve([]);
            },
          }),
        });

        return callback(mockTx);
      });

      const req = {
        auth: { userId: validUserId },
        body: {
          showtimeId: validShowtimeId,
          seatIds: [seatId1, seatId2],
        },
      };
      const res = createMockRes();

      await createBooking(req, res, () => {});

      assert.equal(lockedQueryExecuted, true);
      assert.equal(res.getStatusCode(), 409);
      assert.equal(res.getBody().success, false);
      assert.equal(
        res.getBody().message,
        "One or more selected seats are already booked.",
      );
    });

    it("catches PostgreSQL unique constraint error (code 23505) and returns HTTP 409", async () => {
      mock.method(db, "transaction", async () => {
        const dbError = new Error(
          'duplicate key value violates unique constraint "booking_seats_showtime_seat_active_unique"',
        );
        dbError.code = "23505";
        throw dbError;
      });

      const req = {
        auth: { userId: validUserId },
        body: {
          showtimeId: validShowtimeId,
          seatIds: [seatId1],
        },
      };
      const res = createMockRes();

      await createBooking(req, res, () => {});

      assert.equal(res.getStatusCode(), 409);
      assert.equal(res.getBody().success, false);
      assert.equal(
        res.getBody().message,
        "One or more selected seats are already booked.",
      );
    });
  });

  describe("Validation & integrity boundaries", () => {
    it("returns HTTP 404 when showtime does not exist", async () => {
      mock.method(db, "transaction", async (callback) => {
        const mockTx = {
          execute: async () => ({ rows: [] }),
        };
        return callback(mockTx);
      });

      const req = {
        auth: { userId: validUserId },
        body: {
          showtimeId: validShowtimeId,
          seatIds: [seatId1],
        },
      };
      const res = createMockRes();

      await createBooking(req, res, () => {});

      assert.equal(res.getStatusCode(), 404);
      assert.equal(res.getBody().message, "Showtime not found.");
    });

    it("returns HTTP 400 when seats belong to a different screen", async () => {
      mock.method(db, "transaction", async (callback) => {
        let step = 0;
        const mockTx = {
          execute: async () => ({
            rows: [{ id: validShowtimeId, price_in_paise: 25000 }],
          }),
          select: () => ({
            from: () => ({
              where: () => {
                step++;
                if (step === 1) {
                  return {
                    limit: async () => [
                      {
                        id: validShowtimeId,
                        screenId: validScreenId,
                        priceInPaise: 25000,
                      },
                    ],
                  };
                }
                // Physical seat has different screenId
                return Promise.resolve([
                  {
                    id: seatId1,
                    screenId: "99999999-9999-4000-8000-999999999999",
                  },
                ]);
              },
            }),
          }),
        };
        return callback(mockTx);
      });

      const req = {
        auth: { userId: validUserId },
        body: {
          showtimeId: validShowtimeId,
          seatIds: [seatId1],
        },
      };
      const res = createMockRes();

      await createBooking(req, res, () => {});

      assert.equal(res.getStatusCode(), 400);
      assert.equal(
        res.getBody().message,
        "Selected seats do not belong to this show's screen.",
      );
    });
  });
});
