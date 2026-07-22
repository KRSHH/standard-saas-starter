import { env } from "@/lib/env";

// Central site config — single source of truth for SEO + branding.
// Brand values are env-driven so the template ships without hard-coded names.

function trimmedUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).toString();
  } catch {
    return undefined;
  }
}

const name = env.NEXT_PUBLIC_APP_NAME;
const twitter = trimmedUrl(env.NEXT_PUBLIC_TWITTER_URL);
const github = trimmedUrl(env.NEXT_PUBLIC_GITHUB_URL);

const externalLinks = { twitter, github } as const;

export const siteConfig = {
  name,
  title: `${name} — The modern way to run your business`,
  description: `${name} is a production-ready Next.js SaaS template. Authentication, billing, observability, and a hardened security baseline — batteries included.`,
  url: env.NEXT_PUBLIC_APP_URL,
  locale: "en_US",
  keywords: [
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
