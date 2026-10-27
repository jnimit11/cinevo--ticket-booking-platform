import { registerSchema, loginSchema } from "./auth.validator.js";
import { registerUser, loginUser, getCurrentUser } from "./auth.service.js";

export async function register(req, res, next) {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration data",
        errors: result.error.issues,
      });
    }

    const { name, email, password } = result.data;
    const authResult = await registerUser({ name, email, password });

    if (authResult.conflict) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: authResult.user,
      token: authResult.token,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid Login credentials",
        errors: result.error.issues,
      });
    }

    const { email, password } = result.data;
    const authResult = await loginUser({ email, password });

    if (authResult.unauthorized) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    return res.status(200).json({
      user: authResult.user,
      token: authResult.token,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await getCurrentUser(req.auth.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}
