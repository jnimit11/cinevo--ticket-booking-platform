import "dotenv/config";

export const env = {
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "id"
};

if(!env.databaseUrl){
    throw new Error("DATABASE_URL is missing in backend.env")
}

if (!env.jwtSecret){
  throw new Error("JWT_SECRET is missing in backend/env")
}