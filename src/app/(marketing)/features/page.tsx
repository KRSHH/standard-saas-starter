import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Features",
  description:
    "Everything included in this Next.js SaaS template: auth, billing, observability, security, testing, and SEO.",
  path: "/features",
});

const FEATURES = [
  {
    category: "Authentication",
    items: [
      "Supabase SSR (cookie-based PKCE)",
      "Sign-in / sign-up / OAuth callback",
      "Server + browser + admin clients",
      "Route protection in middleware",
    ],
  },
  {
    category: "Database",
    items: [
      "Postgres via Supabase",
      "Drizzle ORM (type-safe schema + migrations)",
      "Row Level Security on every table",
      "Auto profile creation on signup",
    ],
  },
  {
    category: "Billing",
    items: [
      "Razorpay + Stripe adapters",
      "Server-authoritative subscription store",
      "Webhook idempotency (dedup ledger)",
      "Signature verification (HMAC + Stripe)",
    ],
  },
  {
    category: "Observability",
    items: [
      "PostHog (web + server)",
      "Sentry (replays + traces)",
      "/api/health endpoint",
      "Structured request logging",
    ],
  },
  {
    category: "Security",
    items: [
      "Strict CSP with per-request nonce",
      "Full security header bundle (HSTS, etc.)",
      "Rate limiting on API routes",
      "Private storage bucket",
    ],
  },
  {
    category: "SEO",
    items: [
      "Metadata + openGraph defaults",
      "Dynamic OG image (edge runtime)",
      "JSON-LD structured data",
      "sitemap.xml + robots.txt + manifest",
    ],
  },
  {
    category: "Quality",
    items: [
      "TypeScript (strict, noUncheckedIndexedAccess)",
      "ESLint 9 flat config + Prettier",
      "Vitest unit tests",
      "Playwright E2E + GitHub Actions CI",
    ],
  },
] as const;

export default function FeaturesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-24">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Everything included
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
          A complete, production-tested foundation. Configure your keys and
          start building features on day one.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
        {FEATURES.map((group) => (
          <div key={group.category} className="flex flex-col gap-3">
            <h2 className="text-foreground text-lg font-semibold">
              {group.category}
            </h2>
            <ul className="flex flex-col gap-2">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="text-muted-foreground flex items-center gap-2 text-sm"
                >
                  <CheckCircle2 className="size-4 text-green-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
