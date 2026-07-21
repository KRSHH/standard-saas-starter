import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getPublicSupabaseEnv } from "@/lib/env";

/**
 * Supabase server client — use in Server Components, Route Handlers,
 * and Server Actions. Reads/writes auth cookies via next/headers.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore.
          // Middleware will refresh the session via updateSession().
        }
      },
    },
  });
}
