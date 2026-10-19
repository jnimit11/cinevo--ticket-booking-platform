import "dotenv/config";

export const env = {
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
};

if(!env.databaseUrl){
    throw new Error("DATABASE_URL is missing in backend.env")
}