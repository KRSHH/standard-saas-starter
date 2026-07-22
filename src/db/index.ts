import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

import * as schema from "./schema";

// Drizzle client — Node runtime (server functions / actions / route handlers).
// Single connection, pgBouncer-friendly. Env validated by the typed schema.
const client = postgres(env.DATABASE_URL, { prepare: false, max: 1 });

export const db = drizzle(client, { schema });
export type DB = typeof db;

export { schema };
