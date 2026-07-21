import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseEnv } from "@/lib/env";

/**
 * Supabase browser client — use in Client Components.
 * Auth state is stored in cookies via the SSR adapter (not localStorage),
 * so server and client share the same session.
 */
export function createClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
