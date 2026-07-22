#!/usr/bin/env bun
/**
 * First-run setup + config doctor. Dependency-free; run via `bun run setup`.
 *
 *   1. Creates .env.local from .env.example (never overwrites).
 *   2. Reports which services are configured vs missing, split into
 *      REQUIRED (app won't boot) and OPTIONAL (degrade gracefully).
 *   3. Prints the exact next commands to run.
 *
 * Re-run it any time — it's read-only except for the initial copy.
 */

import { existsSync, readFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const envPath = join(root, ".env.local");
const examplePath = join(root, ".env.example");

// ---------- helpers ----------

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

/** Values copied straight from .env.example that don't count as configured. */
const PLACEHOLDER_PATTERNS = [
  /YOUR-PROJECT/i,
  /YOUR-DATABASE/i,
  /your-anon-key/i,
  /your-service-role-key/i,
  /your-upstash-rest-token/i,
  /your-org/i,
  /your-project/i,
  /yourdomain/i,
  /^(rzp_test_)?xxx$/i,
  /^(sk_test_|pk_test_|whsec_|re_|phc_|phx_|plan_|price_|sntrys_)?xxx$/i,
  /^https:\/\/xxx@/i,
  /^0x4AAAAAA/i, // Turnstile example keys from .env.example
];

function parseEnvFile(path: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!existsSync(path)) return vars;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    const key = match?.[1];
    if (!match || !key) continue;
    let value = (match[2] ?? "").trim();
    // Strip trailing inline comment, then surrounding quotes.
    value = value.replace(/\s+#.*$/, "").trim();
    value = value.replace(/^(["'])(.*)\1$/, "$2");
    vars[key] = value;
  }
  return vars;
}

function isConfigured(value: string | undefined): boolean {
  if (!value) return false;
  return !PLACEHOLDER_PATTERNS.some((p) => p.test(value));
}

// ---------- service definitions ----------

interface Service {
  name: string;
  vars: string[];
  /** What you lose (or what happens) when unconfigured. */
  note: string;
}

const REQUIRED: Service[] = [
  {
    name: "Supabase (auth + storage)",
    vars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    note: "app won't boot — middleware needs these on every request",
  },
  {
    name: "Postgres (Drizzle)",
    vars: ["DATABASE_URL"],
    note: "required for db:migrate and all data access",
  },
];

const OPTIONAL: Service[] = [
  {
    name: "Supabase service role",
    vars: ["SUPABASE_SERVICE_ROLE_KEY"],
    note: "needed for uploads, account deletion, seed script",
  },
  {
    name: "Stripe billing",
    vars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    note: "subscription webhook stays inactive without it",
  },
  {
    name: "Razorpay billing",
    vars: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
    note: "subscription webhook stays inactive without it",
  },
  {
    name: "Resend email",
    vars: ["RESEND_API_KEY"],
    note: "transactional email + email notifications are skipped",
  },
  {
    name: "Upstash rate limiting",
    vars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    note: "dev uses in-memory limiter; REQUIRED in production (fails closed)",
  },
  {
    name: "PostHog analytics",
    vars: ["NEXT_PUBLIC_POSTHOG_KEY"],
    note: "analytics events are no-ops",
  },
  {
    name: "Sentry error tracking",
    vars: ["NEXT_PUBLIC_SENTRY_DSN"],
    note: "error reporting disabled",
  },
  {
    name: "Cloudflare Turnstile",
    vars: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY"],
    note: "auth forms work without bot protection (secret goes in Supabase dashboard)",
  },
];

// ---------- run ----------

console.log(`\n${bold("Next.js SaaS Template — setup")}\n`);

if (!existsSync(examplePath)) {
  console.error(
    `${red("X")} .env.example not found next to package.json — run this from the repo root.`,
  );
  process.exit(1);
}

// 1. Ensure .env.local exists.
if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
  console.log(`${green("OK")} Created ${bold(".env.local")} from .env.example`);
} else {
  console.log(
    `${green("OK")} ${bold(".env.local")} already exists (left untouched)`,
  );
}

const env = parseEnvFile(envPath);

// 2. Report status per service.
function report(services: Service[]): number {
  let missing = 0;
  for (const svc of services) {
    const unset = svc.vars.filter((v) => !isConfigured(env[v]));
    if (unset.length === 0) {
      console.log(`  ${green("+")} ${svc.name}`);
    } else {
      missing++;
      console.log(`  ${yellow("-")} ${svc.name} ${dim(`— ${svc.note}`)}`);
      for (const v of unset) console.log(`      ${dim(`missing ${v}`)}`);
    }
  }
  return missing;
}

console.log(`\n${bold("Required")}`);
const missingRequired = report(REQUIRED);

console.log(
  `\n${bold("Optional")} ${dim("(everything degrades gracefully in dev)")}`,
);
report(OPTIONAL);

// 3. Next steps.
console.log(`\n${bold("Next steps")}`);
if (missingRequired > 0) {
  console.log(
    `  1. Create a free Supabase project ${dim("https://supabase.com/dashboard")}`,
  );
  console.log(`  2. Fill the ${red("required")} values in .env.local`);
  console.log(
    `     ${dim("Project Settings → API (URL + anon key) and → Database (connection string)")}`,
  );
  console.log(
    `  3. ${bold("bun run db:migrate")}   ${dim("apply schema + RLS + triggers + storage bucket")}`,
  );
  console.log(
    `  4. ${bold("bun run dev")}          ${dim("http://localhost:3000")}`,
  );
} else {
  console.log(
    `  ${bold("bun run db:migrate")}   ${dim("apply schema + RLS (safe to re-run)")}`,
  );
  console.log(`  ${bold("bun run db:seed")}      ${dim("optional dev data")}`);
  console.log(
    `  ${bold("bun run dev")}          ${dim("http://localhost:3000")}`,
  );
}
console.log(
  `\n${dim("Re-run `bun run setup` any time to re-check configuration.")}\n`,
);

process.exit(0);
