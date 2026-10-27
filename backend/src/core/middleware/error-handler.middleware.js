export function errorHandler(err, req, res, next) {
  // PostgreSQL 22P02: Invalid text representation (e.g., malformed UUID parameter)
  if (err.code === "22P02") {
    return res.status(400).json({
      success: false,
      message: "Invalid parameter format: expected a valid UUID.",
    });
  }

  // PostgreSQL 23505: Unique constraint violation
  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "A resource with these unique properties already exists.",
    });
  }

  // Zod validation errors
  if (err.name === "ZodError" || err.issues) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues,
    });
  }

  console.error("[Cinevo Error]:", err);
  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
