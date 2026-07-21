import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // Supabase-compatible migration filenames (YYYYMMDDHHMMSS_name.sql).
  migrations: {
    prefix: "supabase",
  },
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
