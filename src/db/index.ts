import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Drizzle client — Node runtime (Vercel server functions / server actions).
 * For edge runtime, use the @neondatabase/serverless HTTP driver instead.
 *
 * Connection: Supabase direct connection (port 5432) for migrations,
 * pooler (pgBouncer, port 6543) recommended for serverless.
 */
const queryString = process.env.DATABASE_URL;
if (!queryString) {
  throw new Error("DATABASE_URL is not set");
}

// Single connection for Serverless functions (pgBouncer-friendly).
const client = postgres(queryString, {
  prepare: false,
  max: 1,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;

export { schema };
