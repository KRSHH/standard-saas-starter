import type { Provider } from "@supabase/supabase-js";

/**
 * OAuth providers the template knows how to surface.
 *
 * Provider ENABLEMENT is configured in the Supabase dashboard (Auth →
 * Providers), not here — this list only controls which buttons the UI
 * renders. Remove entries for providers you don't intend to enable, or add
 * new ones (Provider type already covers all Supabase-supported names).
 *
 * The `id` is the Supabase provider id used in signInWithOAuth / linkIdentity.
 * `name` is the display label.
 */
export interface OAuthProviderConfig {
  id: Provider;
  name: string;
}

export const OAUTH_PROVIDERS: readonly OAuthProviderConfig[] = [
  { id: "google", name: "Google" },
  { id: "github", name: "GitHub" },
] as const;
