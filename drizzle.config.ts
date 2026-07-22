import { defineConfig } from "drizzle-kit";

// Migrations need a DIRECT connection (port 5432), not the pooled one.
// The Supabase Vercel integration exposes this as POSTGRES_URL_NON_POOLING;
// fall back to DATABASE_URL or the pooled aliases so it works either way.
const databaseUrl =
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL (or POSTGRES_URL_NON_POOLING) is required for migrations",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  migrations: { prefix: "supabase" },
  dbCredentials: { url: databaseUrl },
  verbose: true,
  strict: true,
});
