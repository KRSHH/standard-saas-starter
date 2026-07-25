// Central site config — single source of truth for SEO + branding.
//
// Reads NEXT_PUBLIC_* directly (not via the typed env schema) because this
// module is imported by edge bundles (opengraph-image, manifest, sitemap) and
// dragging @t3-oss/env-nextjs + zod into those blew the 1 MB edge limit.
// These are all public vars with sensible defaults; server-secret validation
// stays in src/lib/env.ts for server code.

function trimmedUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).toString();
  } catch {
    return undefined;
  }
}

const name = process.env.NEXT_PUBLIC_APP_NAME || "Acme";
const twitter = trimmedUrl(process.env.NEXT_PUBLIC_TWITTER_URL);
const github = trimmedUrl(process.env.NEXT_PUBLIC_GITHUB_URL);

const externalLinks = { twitter, github } as const;

export const siteConfig = {
  name,
  title: `${name} — The modern way to run your business`,
  description: `${name} is a production-ready Next.js SaaS template. Authentication, billing, observability, and a hardened security baseline — batteries included.`,
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  locale: "en_US",
  keywords: [
    "Standard SaaS Starter",
    "Next.js template",
    "SaaS boilerplate",
    "Next.js SaaS starter",
    "TypeScript SaaS",
    "Supabase auth",
    "Stripe billing",
    "production Next.js",
  ] as string[],
  links: {
    ...externalLinks,
    legal: {
      privacy: "/privacy",
      terms: "/terms",
      cookies: "/cookies",
      contact: "/contact",
    },
  },
} as const;

export type SiteConfig = typeof siteConfig;

// External profile URLs that are actually set — for JSON-LD `sameAs`.
export function configuredExternalLinks(): string[] {
  return Object.values(externalLinks).filter(
    (v): v is string => typeof v === "string",
  );
}
