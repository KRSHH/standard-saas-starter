/**
 * Central site config — single source of truth for SEO + branding.
 * Used by root layout, sitemap, robots, manifest, OG image.
 *
 * Replace "Acme" with your product name before shipping.
 */
export const siteConfig = {
  name: "Acme",
  title: "Acme — The modern way to run your business",
  description:
    "Acme is a production-ready Next.js SaaS template. Authentication, billing, observability, and a hardened security baseline — batteries included.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
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
    twitter: "https://twitter.com/yourbrand",
    github: "https://github.com/yourbrand/nextjs-template",
  },
} as const;

export type SiteConfig = typeof siteConfig;
