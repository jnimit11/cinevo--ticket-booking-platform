import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema/index.js";
import { env } from "../config/env.js";
import { registerSchema, loginSchema } from "../validators/auth.validator.js";

export async function register(req, res, next) {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid registration data",
        errors: result.error.issues,
      });
    }

    const { name, email, password } = result.data;

    const [existinguser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existinguser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    const token = jwt.sign({ sub: user.id }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });

    return res.status(201).json({
      message: "registration successfull",
      user,
      token,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
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

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }
    const token = jwt.sign({ sub: user.id }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, req.auth.userId))
      .limit(1);

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
