import { createClient } from "@supabase/supabase-js";

import { getPublicSupabaseEnv, requireEnv } from "@/lib/env";

/**
 * Admin Supabase client — bypasses RLS using the service role key.
 * Server-only. NEVER import in client components or expose to browser.
 * Use for: webhooks, cron jobs, system-level migrations.
 */
export function createAdminClient() {
  const { url } = getPublicSupabaseEnv();
  const serviceRoleKey = requireEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
