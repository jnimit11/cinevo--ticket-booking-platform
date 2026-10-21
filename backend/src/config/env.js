import "dotenv/config";
import jwt from "jsonwebtoken";

export const env = {
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
};

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is missing in backend.env");
}

if (!env.jwtSecret) {
  throw new Error("JWT_SECRET is missing in backend/env");
}

// Validate that jwtExpiresIn is a duration string the jsonwebtoken library
// actually accepts. Rather than reimplementing the ms() parser, perform a
// one-time trial sign at startup so invalid values surface immediately
// instead of crashing on the first login or register request.
try {
  jwt.sign({ _: "startup-check" }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
} catch {
  throw new Error(
    `JWT_EXPIRES_IN value "${env.jwtExpiresIn}" is not a valid duration. ` +
      'Use a timespan string such as "1d", "7d", "2h", or "30m".',
  );
}