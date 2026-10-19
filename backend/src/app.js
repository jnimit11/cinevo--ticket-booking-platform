import express from "express";
import cors from "cors";
import helmet from "helmet";
import { json } from "drizzle-orm/gel-core";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express(json));

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Cinevo APi is running "
    })
})

export default app;