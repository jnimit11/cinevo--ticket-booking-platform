import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, it, mock, afterEach } from "node:test";
import jwt from "jsonwebtoken";

// Resolve the absolute path to env.js so the child process can import it
// without depending on its own cwd-relative import.meta.url resolution.
const backendDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const envModulePath = path
  .join(backendDir, "src", "config", "env.js")
  .replaceAll("\\", "/");

// ---------------------------------------------------------------------------
// Helper: spawn a fresh Node process that loads env.js with controlled
// environment variables.  This avoids fighting the module cache and ensures
// the module-level validation runs from scratch each time.
// ---------------------------------------------------------------------------

function loadEnvModule(envOverrides = {}) {
  return new Promise((resolve) => {
    // Use the absolute file:// URL so the import works regardless of cwd.
    const script = `
      import("file:///${envModulePath}")
        .then(({ env }) => {
          process.stdout.write(JSON.stringify({
            jwtExpiresIn: env.jwtExpiresIn,
            port: env.port,
          }));
        })
        .catch((err) => {
          process.stderr.write(err.message);
          process.exitCode = 1;
        });
    `;

    execFile(
      process.execPath,
      ["--input-type=module", "-e", script],
      {
        cwd: backendDir,
        env: {
          // Provide the mandatory env vars so env.js doesn't throw for
          // missing DATABASE_URL / JWT_SECRET.
          DATABASE_URL: "postgresql://localhost:5432/cinevo_test_fake",
          JWT_SECRET: "test-secret-for-jwt-config-validation",
          ...envOverrides,
        },
        timeout: 10_000,
      },
      (error, stdout, stderr) => {
        if (error) {
          resolve({ ok: false, stderr: stderr.toString() });
        } else {
          try {
            resolve({ ok: true, config: JSON.parse(stdout.toString()) });
          } catch {
            resolve({ ok: false, stderr: stdout.toString() });
          }
        }
      },
    );
  });
}

describe("JWT Expiration Configuration (env.js)", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  // -----------------------------------------------------------------------
  // 1. Default value when JWT_EXPIRES_IN is omitted
  // -----------------------------------------------------------------------
  describe("Default fallback when JWT_EXPIRES_IN is omitted", () => {
    it("uses '1d' when JWT_EXPIRES_IN is not set", async () => {
      const result = await loadEnvModule({
        // JWT_EXPIRES_IN deliberately not provided
      });

      assert.equal(result.ok, true, `env.js failed to load: ${result.stderr}`);
      assert.equal(result.config.jwtExpiresIn, "1d");
    });
  });

  // -----------------------------------------------------------------------
  // 2. Valid configured durations
  // -----------------------------------------------------------------------
  describe("Valid configured durations", () => {
    for (const duration of ["7d", "2h", "30m", "1d", "365d"]) {
      it(`accepts JWT_EXPIRES_IN="${duration}"`, async () => {
        const result = await loadEnvModule({ JWT_EXPIRES_IN: duration });

        assert.equal(result.ok, true, `env.js failed to load: ${result.stderr}`);
        assert.equal(result.config.jwtExpiresIn, duration);
      });
    }
  });

  // -----------------------------------------------------------------------
  // 3. Invalid durations fail at startup
  // -----------------------------------------------------------------------
  describe("Invalid durations fail at startup", () => {
    for (const invalid of ["id", "abc", "notavalue"]) {
      it(`rejects JWT_EXPIRES_IN="${invalid}" with a clear error`, async () => {
        const result = await loadEnvModule({ JWT_EXPIRES_IN: invalid });

        assert.equal(result.ok, false);
        assert.ok(
          result.stderr.includes("JWT_EXPIRES_IN"),
          `Expected error mentioning JWT_EXPIRES_IN, got: ${result.stderr}`,
        );
        assert.ok(
          result.stderr.includes(invalid),
          `Expected error mentioning the bad value "${invalid}", got: ${result.stderr}`,
        );
      });
    }
  });

  // -----------------------------------------------------------------------
  // 4. The old typo default "id" is no longer present
  // -----------------------------------------------------------------------
  describe("Typo regression guard", () => {
    it("the default is '1d', not the old typo 'id'", async () => {
      const result = await loadEnvModule({});

      assert.equal(result.ok, true, `env.js failed to load: ${result.stderr}`);
      assert.notEqual(result.config.jwtExpiresIn, "id");
      assert.equal(result.config.jwtExpiresIn, "1d");
    });
  });

  // -----------------------------------------------------------------------
  // 5. JWT signing remains compatible with the default expiration
  // -----------------------------------------------------------------------
  describe("JWT signing compatibility", () => {
    it("jwt.sign produces a token with correct exp claim using '1d'", () => {
      const secret = "test-secret-jwt-compat";
      const nowSeconds = Math.floor(Date.now() / 1000);

      const token = jwt.sign({ sub: "user-123" }, secret, {
        expiresIn: "1d",
      });

      const payload = jwt.verify(token, secret);

      assert.equal(payload.sub, "user-123");
      assert.equal(typeof payload.exp, "number");
      assert.equal(typeof payload.iat, "number");

      const lifetime = payload.exp - payload.iat;
      // 1d = 86400 seconds
      assert.equal(lifetime, 86400);
      // iat should be very recent (within 5 seconds of now)
      assert.ok(
        Math.abs(payload.iat - nowSeconds) < 5,
        `iat ${payload.iat} too far from now ${nowSeconds}`,
      );
    });

    it("jwt.sign produces a token with correct exp claim using '7d'", () => {
      const secret = "test-secret-jwt-compat-7d";

      const token = jwt.sign({ sub: "user-456" }, secret, {
        expiresIn: "7d",
      });

      const payload = jwt.verify(token, secret);
      const lifetime = payload.exp - payload.iat;
      // 7d = 604800 seconds
      assert.equal(lifetime, 604800);
    });

    it("jwt.verify rejects expired tokens correctly", () => {
      const secret = "test-secret-jwt-expiry";

      // Sign a token that expired 10 seconds ago
      const token = jwt.sign(
        { sub: "user-789", iat: Math.floor(Date.now() / 1000) - 20 },
        secret,
        { expiresIn: 10 },
      );

      assert.throws(
        () => jwt.verify(token, secret),
        (err) => err.name === "TokenExpiredError",
      );
    });
  });
});
