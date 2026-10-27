import {
  createCinemaSchema,
  listCinemasQuerySchema,
} from "./cinema.validator.js";
import { fetchCinemas, insertCinema } from "./cinema.service.js";

export async function getCinemas(req, res, next) {
  try {
    const validation = listCinemasQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.error.issues,
      });
    }

    const { page, limit, city } = validation.data;
    const data = await fetchCinemas({ page, limit, city });

    return res.status(200).json({
      success: true,
      pagination: data.pagination,
      count: data.count,
      cinemas: data.cinemas,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCinema(req, res, next) {
  try {
    const validation = createCinemaSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid cinema data",
        errors: validation.error.issues,
      });
    }

    const cinema = await insertCinema(validation.data);

    return res.status(201).json({
      success: true,
      message: "Cinema created successfully",
      cinema,
    });
  } catch (error) {
    next(error);
  }
}
