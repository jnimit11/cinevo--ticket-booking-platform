import app from "./app.js";
import { pool } from "./db/index.js";
import { env } from "./config/env.js";

async function startServer() {
  try {
    await pool.query("SELECT 1");

    app.listen(env.port, () => {
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
