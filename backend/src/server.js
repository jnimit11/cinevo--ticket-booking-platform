import app from "./app.js";
import { pool } from "./core/db/client.js";
import { env } from "./core/config/env.js";

async function startServer() {
  try {
    await pool.query("SELECT 1");

    app.listen(env.port, "0.0.0.0", () => {
      console.log(`Cinevo is running on port ${env.port}`);
      console.log("Postgres connected successfully");
    });
  } catch (error) {
    console.error("Failed to start Cinevo:", error);
    await pool.end();
    process.exit(1);
  }
}

startServer();
