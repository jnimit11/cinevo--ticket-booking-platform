import assert from "node:assert/strict";
import http from "node:http";
import { after, afterEach, before, describe, it, mock } from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { login } from "../src/controllers/auth.controller.js";
import { db } from "../src/db/index.js";

function mockDbSelectResult(rows) {
  return mock.method(db, "select", () => ({
    from: () => ({
      where: () => ({
        limit: async () => rows,
      }),
    }),
  }));
}

function mockDbSelectError(error) {
  return mock.method(db, "select", () => ({
    from: () => ({
      where: () => ({
        limit: async () => {
          throw error;
        },
      }),
    }),
  }));
}

describe("Auth Controller - Login Error Handling and Contract Preservation", () => {
  let server;
  let baseUrl;

  before(async () => {
    // Start an ephemeral HTTP server using the Cinevo Express app
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

  describe("Response contracts (Unit level)", () => {
    it("returns 400 with validation errors when request body is invalid", async () => {
      let statusCode;
      let jsonBody;
      let nextCalled = false;

      const req = {
        body: { email: "not-an-email", password: "" },
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonBody = data;
          return this;
        },
      };
      const next = (err) => {
        nextCalled = true;
      };

      await login(req, res, next);

      assert.equal(nextCalled, false);
      assert.equal(statusCode, 400);
      assert.equal(jsonBody.message, "Invalid Login credentials");
      assert.ok(Array.isArray(jsonBody.errors));
    });

    it("returns 401 when user is not found in database", async () => {
      mockDbSelectResult([]);

      let statusCode;
      let jsonBody;
      let nextCalled = false;

      const req = {
        body: { email: "nonexistent@example.com", password: "password123" },
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonBody = data;
          return this;
        },
      };
      const next = (err) => {
        nextCalled = true;
      };

      await login(req, res, next);

      assert.equal(nextCalled, false);
      assert.equal(statusCode, 401);
      assert.deepEqual(jsonBody, { message: "Invalid email or password" });
    });

    it("returns 401 when password does not match hash", async () => {
      mockDbSelectResult([
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Test User",
          email: "user@example.com",
          role: "customer",
          passwordHash: "$2b$12$dummyHashValueForTestingOnly",
        },
      ]);
      mock.method(bcrypt, "compare", async () => false);

      let statusCode;
      let jsonBody;
      let nextCalled = false;

      const req = {
        body: { email: "user@example.com", password: "wrongpassword" },
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonBody = data;
          return this;
        },
      };
      const next = (err) => {
        nextCalled = true;
      };

      await login(req, res, next);

      assert.equal(nextCalled, false);
      assert.equal(statusCode, 401);
      assert.deepEqual(jsonBody, { message: "Invalid email or password" });
    });

    it("returns 200 with user data (excluding passwordHash) and token on valid credentials", async () => {
      mockDbSelectResult([
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Test User",
          email: "user@example.com",
          role: "customer",
          passwordHash: "$2b$12$dummyHashValueForTestingOnly",
        },
      ]);
      mock.method(bcrypt, "compare", async () => true);
      mock.method(jwt, "sign", () => "mocked-jwt-token");

      let statusCode;
      let jsonBody;
      let nextCalled = false;

      const req = {
        body: { email: "user@example.com", password: "correctpassword" },
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonBody = data;
          return this;
        },
      };
      const next = (err) => {
        nextCalled = true;
      };

      await login(req, res, next);

      assert.equal(nextCalled, false);
      assert.equal(statusCode, 200);
      assert.deepEqual(jsonBody, {
        user: {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Test User",
          email: "user@example.com",
          role: "customer",
        },
        token: "mocked-jwt-token",
      });
      assert.equal(jsonBody.user.passwordHash, undefined);
    });

    it("forwards unexpected database error to next(error) without leaving request pending", async () => {
      const dbError = new Error("Connection terminated unexpectedly");
      mockDbSelectError(dbError);

      let nextError;
      const req = {
        body: { email: "user@example.com", password: "password123" },
      };
      const res = {
        status() {
          throw new Error("res.status should not be called when error is forwarded");
        },
        json() {
          throw new Error("res.json should not be called when error is forwarded");
        },
      };
      const next = (err) => {
        nextError = err;
      };

      await login(req, res, next);

      assert.equal(nextError, dbError);
    });

    it("forwards unexpected token signing error to next(error)", async () => {
      mockDbSelectResult([
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Test User",
          email: "user@example.com",
          role: "customer",
          passwordHash: "$2b$12$dummyHashValueForTestingOnly",
        },
      ]);
      mock.method(bcrypt, "compare", async () => true);

      const signError = new Error("Failed to sign token");
      mock.method(jwt, "sign", () => {
        throw signError;
      });

      let nextError;
      const req = {
        body: { email: "user@example.com", password: "password123" },
      };
      const res = {
        status() {
          throw new Error("res.status should not be called when error is forwarded");
        },
        json() {
          throw new Error("res.json should not be called when error is forwarded");
        },
      };
      const next = (err) => {
        nextError = err;
      };

      await login(req, res, next);

      assert.equal(nextError, signError);
    });
  });

  describe("Centralized error handling and HTTP route integration", () => {
    it("handles unexpected database error via centralized middleware with 500 status and generic message", async () => {
      const consoleErrorMock = mock.method(console, "error", () => {});
      mockDbSelectError(new Error("FATAL: database system is in recovery mode"));

      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
        }),
      });

      const body = await response.json();

      assert.equal(response.status, 500);
      assert.deepEqual(body, {
        success: false,
        message: "Internal server error",
      });
      // Ensure sensitive database error details are not leaked in response
      assert.equal(body.error, undefined);
      assert.equal(body.stack, undefined);
      assert.ok(
        !JSON.stringify(body).includes("FATAL"),
        "Response must not leak database internals",
      );
      assert.ok(consoleErrorMock.mock.callCount() >= 1);
    });

    it("handles unexpected token signing exception with 500 status without leaving request pending", async () => {
      mock.method(console, "error", () => {});
      mockDbSelectResult([
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Test User",
          email: "user@example.com",
          role: "customer",
          passwordHash: "$2b$12$dummyHashValueForTestingOnly",
        },
      ]);
      mock.method(bcrypt, "compare", async () => true);
      mock.method(jwt, "sign", () => {
        throw new Error("JWT key signing error");
      });

      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
        }),
      });

      const body = await response.json();

      assert.equal(response.status, 500);
      assert.deepEqual(body, {
        success: false,
        message: "Internal server error",
      });
    });

    it("preserves valid login HTTP response contract end-to-end", async () => {
      mockDbSelectResult([
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Jane Cinephile",
          email: "jane@example.com",
          role: "admin",
          passwordHash: "$2b$12$dummyHashValueForTestingOnly",
        },
      ]);
      mock.method(bcrypt, "compare", async () => true);
      mock.method(jwt, "sign", () => "valid-jwt-token");

      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "jane@example.com",
          password: "adminPassword123",
        }),
      });

      const body = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(body, {
        user: {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Jane Cinephile",
          email: "jane@example.com",
          role: "admin",
        },
        token: "valid-jwt-token",
      });
    });

    it("preserves invalid credential 401 HTTP response contract end-to-end", async () => {
      mockDbSelectResult([]);

      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nobody@example.com",
          password: "wrongPassword123",
        }),
      });

      const body = await response.json();

      assert.equal(response.status, 401);
      assert.deepEqual(body, {
        message: "Invalid email or password",
      });
    });
  });
});
