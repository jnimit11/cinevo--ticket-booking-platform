import "dotenv/config";

export default {
  dialect: "postgresql",
  schema: "./src/core/db/schema.js",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
