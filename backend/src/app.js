import express from "express";
import cors from "cors";
import helmet from "helmet";

import { errorHandler } from "./core/middleware/error-handler.middleware.js";
import { notFoundHandler } from "./core/middleware/not-found.middleware.js";

import authRoutes from "./modules/auth/index.js";
import movieRoutes from "./modules/movies/index.js";
import cinemaRoutes from "./modules/cinemas/index.js";
import screenRoutes from "./modules/screens/index.js";
import showtimeRoutes from "./modules/showtimes/index.js";
import bookingRoutes from "./modules/bookings/index.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const handleHealthCheck = (req, res) => {
  res.json({
    success: true,
    message: "Cinevo API is running",
  });
};

app.get("/health", handleHealthCheck);
app.get("/api/health", handleHealthCheck);

// Mount Feature Modules
app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/cinemas", cinemaRoutes);
app.use("/api/screens", screenRoutes);
app.use("/api/showtimes", showtimeRoutes);
app.use("/api/bookings", bookingRoutes);

// Catch-all 404 & Centralized Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
