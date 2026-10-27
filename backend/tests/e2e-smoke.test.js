import assert from "node:assert/strict";
import http from "node:http";
import { after, afterEach, before, describe, it, mock } from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { db } from "../src/db/index.js";

describe("Cinevo Full User Journey - E2E Smoke Test", () => {
  let server;
  let baseUrl;
  let userToken;
  const testUserId = "55555555-5555-4555-8555-555555555555";
  const testMovieId = "66666666-6666-4666-8666-666666666666";
  const testScreenId = "77777777-7777-4777-8777-777777777777";
  const testShowtimeId = "88888888-8888-4888-8888-888888888888";
  const testSeatId = "99999999-9999-4999-8999-999999999999";
  const testBookingId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  afterEach(() => {
    mock.restoreAll();
  });

  // 1. User Registration
  it("Step 1: User registers successfully via POST /api/auth/register", async () => {
    mock.method(db, "select", () => ({
      from: () => ({
        where: () => ({
          limit: async () => [], // No existing user with this email
        }),
      }),
    }));

    mock.method(db, "insert", () => ({
      values: () => ({
        returning: async () => [
          {
            id: testUserId,
            name: "Alexander Vance",
            email: "alexander@cinevo.luxury",
            role: "customer",
          },
        ],
      }),
    }));

    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alexander Vance",
        email: "alexander@cinevo.luxury",
        password: "SecurePassword123!",
      }),
    });

    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.user.email, "alexander@cinevo.luxury");
    assert.ok(body.token);
  });

  // 2. User Login
  it("Step 2: User logs in successfully via POST /api/auth/login", async () => {
    const passwordHash = await bcrypt.hash("SecurePassword123!", 10);

    mock.method(db, "select", () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: testUserId,
              name: "Alexander Vance",
              email: "alexander@cinevo.luxury",
              role: "customer",
              passwordHash,
            },
          ],
        }),
      }),
    }));

    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "alexander@cinevo.luxury",
        password: "SecurePassword123!",
      }),
    });

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.user.email, "alexander@cinevo.luxury");
    assert.ok(body.token);
    userToken = body.token;
  });

  // 3. Session Rehydration / Verification
  it("Step 3: Session rehydrates successfully via GET /api/auth/me", async () => {
    mock.method(db, "select", () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: testUserId,
              name: "Alexander Vance",
              email: "alexander@cinevo.luxury",
              role: "customer",
            },
          ],
        }),
      }),
    }));

    const response = await fetch(`${baseUrl}/api/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` },
    });

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.user.id, testUserId);
    assert.equal(body.user.name, "Alexander Vance");
  });

  // 4. Movie Catalogue Listing with Filters & Search
  it("Step 4: Browses movie catalogue via GET /api/movies", async () => {
    let selectCall = 0;
    mock.method(db, "select", () => {
      selectCall++;
      if (selectCall === 1) {
        // Movies query
        return {
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  offset: async () => [
                    {
                      id: testMovieId,
                      title: "Chronicles of the Solar Wind",
                      description: "Deep space voyage.",
                      durationMinutes: 142,
                      language: "English",
                      releaseDate: "2025-03-14",
                      posterUrl: "https://example.com/poster.jpg",
                    },
                  ],
                }),
              }),
            }),
          }),
        };
      }
      // Count query
      return {
        from: () => ({
          where: async () => [{ total: 1 }],
        }),
      };
    });

    const response = await fetch(
      `${baseUrl}/api/movies?page=1&limit=12&search=Solar`,
    );

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.movies.length, 1);
    assert.equal(body.movies[0].id, testMovieId);
    assert.equal(body.pagination.total, 1);
  });

  // 5. Showtime & Seat Layout Selection
  it("Step 5: Inspects showtimes and seat availability for selected movie", async () => {
    let selectCall = 0;
    mock.method(db, "select", () => {
      selectCall++;
      if (selectCall === 1) {
        // Showtimes list
        return {
          from: () => ({
            innerJoin: () => ({
              innerJoin: () => ({
                innerJoin: () => ({
                  where: () => ({
                    orderBy: () => ({
                      limit: () => ({
                        offset: async () => [
                          {
                            id: testShowtimeId,
                            startsAt: new Date(Date.now() + 86400000).toISOString(),
                            endsAt: new Date(Date.now() + 93600000).toISOString(),
                            priceInPaise: 35000,
                            movieId: testMovieId,
                            movieTitle: "Chronicles of the Solar Wind",
                            screenId: testScreenId,
                            screenName: "Screen 1 — Dolby Atmos",
                            cinemaId: "cinema-1",
                            cinemaName: "Cinevo Grand Palais",
                            city: "Mumbai",
                          },
                        ],
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (selectCall === 2) {
        // Showtimes count
        return {
          from: () => ({
            where: async () => [{ total: 1 }],
          }),
        };
      }
      if (selectCall === 3) {
        // fetchShowtimeSeats: showtime details
        return {
          from: () => ({
            innerJoin: () => ({
              innerJoin: () => ({
                innerJoin: () => ({
                  where: () => ({
                    limit: async () => [
                      {
                        id: testShowtimeId,
                        startsAt: new Date(Date.now() + 86400000),
                        endsAt: new Date(Date.now() + 93600000),
                        priceInPaise: 35000,
                        screenId: testScreenId,
                        screenName: "Screen 1 — Dolby Atmos",
                        cinemaName: "Cinevo Grand Palais",
                        movieTitle: "Chronicles of the Solar Wind",
                      },
                    ],
                  }),
                }),
              }),
            }),
          }),
        };
      }
      // fetchShowtimeSeats: screen seats with booking join
      return {
        from: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
              where: () => ({
                orderBy: async () => [
                  {
                    id: testSeatId,
                    rowLabel: "A",
                    seatNumber: 1,
                    seatType: "recliner",
                    bookingId: null, // Available
                  },
                ],
              }),
            }),
          }),
        }),
      };
    });

    // 5a: Fetch showtimes
    const showtimesRes = await fetch(
      `${baseUrl}/api/showtimes?movieId=${testMovieId}`,
    );
    const showtimesBody = await showtimesRes.json();
    assert.equal(showtimesRes.status, 200);
    assert.equal(showtimesBody.showtimes.length, 1);
    assert.equal(showtimesBody.showtimes[0].id, testShowtimeId);

    // 5b: Fetch seat layout for selected showtime
    const seatsRes = await fetch(
      `${baseUrl}/api/showtimes/${testShowtimeId}/seats`,
    );
    const seatsBody = await seatsRes.json();
    assert.equal(seatsRes.status, 200);
    assert.equal(seatsBody.success, true);
    assert.equal(seatsBody.availableSeats, 1);
    assert.equal(seatsBody.seats[0].status, "available");
  });

  // 6. Booking Creation
  it("Step 6: Books available seats via POST /api/bookings", async () => {
    const futureDate = new Date(Date.now() + 86400000);

    mock.method(db, "transaction", async (callback) => {
      let step = 0;
      const mockTx = {
        execute: async () => ({
          rows: [
            {
              id: testShowtimeId,
              price_in_paise: 35000,
              starts_at: futureDate,
            },
          ],
        }),
        select: () => ({
          from: () => ({
            where: (clause) => {
              step++;
              if (step === 1) {
                // Showtime lookup
                return {
                  limit: async () => [
                    {
                      id: testShowtimeId,
                      screenId: testScreenId,
                      priceInPaise: 35000,
                    },
                  ],
                };
              }
              if (step === 2) {
                // Physical seat check
                return Promise.resolve([
                  { id: testSeatId, screenId: testScreenId },
                ]);
              }
              // Active reservations check -> none
              return Promise.resolve([]);
            },
          }),
        }),
        insert: (table) => ({
          values: (val) => ({
            returning: async () => {
              if (Array.isArray(val)) {
                return val.map((v, i) => ({ id: `seat-reservation-${i}`, ...v }));
              }
              return [
                {
                  id: testBookingId,
                  userId: testUserId,
                  showtimeId: testShowtimeId,
                  totalAmountInPaise: 35000,
                  status: "confirmed",
                },
              ];
            },
          }),
        }),
      };

      return callback(mockTx);
    });

    const response = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        showtimeId: testShowtimeId,
        seatIds: [testSeatId],
      }),
    });

    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.booking.id, testBookingId);
    assert.equal(body.booking.totalAmountInPaise, 35000);
  });

  // 7. Booking History
  it("Step 7: Retrieves personal booking history via GET /api/bookings/my", async () => {
    mock.method(db, "select", () => ({
      from: () => ({
        innerJoin: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              innerJoin: () => ({
                leftJoin: () => ({
                  leftJoin: () => ({
                    where: () => ({
                      orderBy: async () => [
                        {
                          id: testBookingId,
                          status: "confirmed",
                          totalAmountInPaise: 35000,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                          showtimeId: testShowtimeId,
                          startsAt: new Date(Date.now() + 86400000).toISOString(),
                          endsAt: new Date(Date.now() + 93600000).toISOString(),
                          movieTitle: "Chronicles of the Solar Wind",
                          cinemaName: "Cinevo Grand Palais",
                          screenName: "Screen 1 — Dolby Atmos",
                          bookingSeatId: "booking-seat-1",
                          rowLabel: "A",
                          seatNumber: 1,
                          seatType: "recliner",
                          priceInPaise: 35000,
                        },
                      ],
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    }));

    const response = await fetch(`${baseUrl}/api/bookings/my`, {
      method: "GET",
      headers: { Authorization: `Bearer ${userToken}` },
    });

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.bookings.length, 1);
    assert.equal(body.bookings[0].id, testBookingId);
    assert.equal(body.bookings[0].seats[0].rowLabel, "A");
  });

  // 8. Booking Cancellation
  it("Step 8: Cancels confirmed future booking via PATCH /api/bookings/:id/cancel", async () => {
    const futureDate = new Date(Date.now() + 86400000);

    mock.method(db, "transaction", async (callback) => {
      let executeCount = 0;
      const mockTx = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [{ showtimeId: testShowtimeId }],
            }),
          }),
        }),
        execute: async () => {
          executeCount++;
          if (executeCount === 1) {
            // Locked showtime
            return {
              rows: [{ id: testShowtimeId, starts_at: futureDate }],
            };
          }
          // Locked booking
          return {
            rows: [{ id: testBookingId, status: "confirmed" }],
          };
        },
        update: () => ({
          set: () => ({
            where: () => ({
              returning: async () => [
                {
                  id: testBookingId,
                  status: "cancelled",
                  updatedAt: new Date(),
                },
              ],
            }),
          }),
        }),
      };

      return callback(mockTx);
    });

    const response = await fetch(
      `${baseUrl}/api/bookings/${testBookingId}/cancel`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${userToken}` },
      },
    );

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.booking.status, "cancelled");
  });
});
