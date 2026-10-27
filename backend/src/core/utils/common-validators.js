import { z } from "zod";

export const uuidParamSchema = z.uuid({
  message: "Invalid ID format: must be a valid UUID.",
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(2147483647).default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
