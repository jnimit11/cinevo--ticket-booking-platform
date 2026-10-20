import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes.js";
import movieRoutes from "./routes/movie.routes.js";
import cinemaRoutes from "./routes/cinema.routes.js";
import screenRoutes from "./routes/screen.routes.js";
import showtimeRoutes from "./routes/showtime.routes.js"

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Cinevo APi is running ",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/cinemas", cinemaRoutes);
app.use("/api/screens", screenRoutes);
app.use("/api/showtimes", showtimeRoutes)

app.use((err, req, res, next) => {
  console.error(err);
S
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});
export default app;
