import "@testing-library/jest-dom/vitest";

// Seed the env vars the typed schema requires at import time.
// Tests run in jsdom (window defined) — t3-env's isServer override lets the
// server schema validate here.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://supabase.localhost";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5432/postgres";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
