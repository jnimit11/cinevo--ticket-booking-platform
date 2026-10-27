import {
  createScreenSchema,
  generateSeatsSchema,
  screenIdSchema,
} from "./screen.validator.js";
import {
  insertScreen,
  generateSeatsForScreen,
} from "./screen.service.js";

export async function createScreen(req, res, next) {
  try {
    const validation = createScreenSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid screen data",
        errors: validation.error.issues,
      });
    }

    const result = await insertScreen(validation.data);

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Screen created successfully",
      screen: result.screen,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A screen with this name already exists in this cinema.",
      });
    }
    next(error);
  }
}

export async function generateSeats(req, res, next) {
  try {
    const idValidation = screenIdSchema.safeParse(req.params.screenId);
    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid screen ID format.",
        errors: idValidation.error.issues,
      });
    }

    const parsed = generateSeatsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid seat generation input.",
        errors: parsed.error.issues,
      });
    }

    const result = await generateSeatsForScreen(idValidation.data, parsed.data);

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    if (result.invalidCapacity) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    if (result.conflict) {
      return res.status(409).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Seats generated successfully.",
      screenId: result.screenId,
      rows: result.rows,
      seatsPerRow: result.seatsPerRow,
      totalSeats: result.totalSeats,
      seats: result.seats,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Duplicate seat positions detected. Please check this screen.",
      });
    }
    next(error);
  }
}
