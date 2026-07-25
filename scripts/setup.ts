#!/usr/bin/env bun
/**
 * First-run setup + config doctor. Run via `bun run setup`.
 *
 *   1. Creates .env.local from .env.example (never overwrites).
 *   2. Reports which services are configured vs missing (REQUIRED vs OPTIONAL).
 *   3. Prints the next commands to run.
 *
 * Re-run any time — read-only except the initial copy.
 */

import { existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const envPath = join(root, ".env.local");
const examplePath = join(root, ".env.example");

// Bun auto-loads .env.local for scripts, so process.env reflects it.
const env = process.env;

// ---------- helpers ----------

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

/** A value counts as configured unless it's an obvious placeholder. */
function isConfigured(value: string | undefined): boolean {
  if (!value) return false;
  return !/(your-|YOUR-|xxx|YOUR-PROJECT|YOUR-DATABASE|yourdomain)/i.test(
    value,
  );
}

// ---------- service definitions ----------
// Each `requires` group: any ONE alias configured satisfies it. Mirrors the
// resolver in src/lib/env.ts so the doctor matches runtime behavior.

interface Service {
  name: string;
  requires: string[][];
  note: string;
}

const REQUIRED: Service[] = [
  {
    name: "Supabase (auth + storage)",
    requires: [
      ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"],
      [
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_ANON_KEY",
        "SUPABASE_PUBLISHABLE_KEY",
      ],
    ],
    note: "app won't boot — middleware needs these on every request",
  },
  {
    name: "Postgres (Drizzle)",
    requires: [["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"]],
    note: "required for db:migrate and all data access",
  },
];

const OPTIONAL: Service[] = [
  {
    name: "Supabase service role",
    requires: [["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]],
    note: "needed for uploads, account deletion, seed script",
  },
  {
    name: "Stripe billing",
    requires: [["STRIPE_SECRET_KEY"], ["STRIPE_WEBHOOK_SECRET"]],
    note: "subscription webhook stays inactive without it",
  },
  {
    name: "Razorpay billing",
    requires: [
      ["RAZORPAY_KEY_ID"],
      ["RAZORPAY_KEY_SECRET"],
      ["RAZORPAY_WEBHOOK_SECRET"],
    ],
    note: "subscription webhook stays inactive without it",
  },
  {
    name: "Resend email",
    requires: [["RESEND_API_KEY"]],
    note: "transactional email + email notifications are skipped",
  },
  {
    name: "Upstash rate limiting",
    requires: [["UPSTASH_REDIS_REST_URL"], ["UPSTASH_REDIS_REST_TOKEN"]],
    note: "dev uses in-memory limiter; REQUIRED in production (fails closed)",
  },
  {
    name: "PostHog analytics",
    requires: [["NEXT_PUBLIC_POSTHOG_KEY"]],
    note: "analytics events are no-ops",
  },
  {
    name: "Sentry error tracking",
    requires: [["NEXT_PUBLIC_SENTRY_DSN", "SENTRY_DSN"]],
    note: "error reporting disabled",
  },
  {
    name: "Cloudflare Turnstile",
    requires: [["NEXT_PUBLIC_TURNSTILE_SITE_KEY"]],
    note: "auth forms work without bot protection (secret goes in Supabase dashboard)",
  },
];

// ---------- run ----------

console.log(`\n${bold("Standard SaaS Starter — setup")}\n`);

if (!existsSync(examplePath)) {
  console.error(
    `${red("X")} .env.example not found next to package.json — run this from the repo root.`,
  );
  process.exit(1);
}

if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
  console.log(
    `${green("OK")} Created ${bold(".env.local")} from .env.example\n`,
  );
  console.log(
    yellow("Refresh env: re-run `bun run setup` after editing .env.local.\n"),
  );
} else {
  console.log(`${green("OK")} ${bold(".env.local")} exists (left untouched)\n`);
}

function report(services: Service[]): number {
  let missing = 0;
  for (const svc of services) {
    const unsatisfied = svc.requires.filter(
      (aliases) => !aliases.some((v) => isConfigured(env[v])),
    );
    if (unsatisfied.length === 0) {
      console.log(`  ${green("+")} ${svc.name}`);
    } else {
      missing++;
      console.log(`  ${yellow("-")} ${svc.name} ${dim(`— ${svc.note}`)}`);
      for (const aliases of unsatisfied) {
        const [primary, ...rest] = aliases;
        const hint = rest.length > 0 ? dim(` (or ${rest.join(" / ")})`) : "";
        console.log(`      ${dim(`missing ${primary}`)}${hint}`);
      }
    }
  }
  return missing;
}

console.log(bold("Required"));
const missingRequired = report(REQUIRED);

console.log(`\n${bold("Optional")} ${dim("(degrades gracefully in dev)")}`);
report(OPTIONAL);

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
    `  3. ${bold("bun run db:migrate")}   ${dim("schema + RLS + triggers + storage bucket")}`,
  );
  console.log(
    `  4. ${bold("bun run dev")}          ${dim("http://localhost:3000")}`,
  );
} else {
  console.log(
    `  ${bold("bun run db:migrate")}   ${dim("schema + RLS (safe to re-run)")}`,
  );
  console.log(`  ${bold("bun run db:seed")}      ${dim("optional dev data")}`);
  console.log(
    `  ${bold("bun run dev")}          ${dim("http://localhost:3000")}`,
  );
}
console.log(`\n${dim("Re-run `bun run setup` any time to re-check.\n")}`);
