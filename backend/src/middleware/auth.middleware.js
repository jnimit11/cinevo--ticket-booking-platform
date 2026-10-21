import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token required",
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    if (typeof payload !== "object" || !payload.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    req.auth = {
      userId: payload.sub,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}
