import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

// Public marketing + legal routes only — app/auth/api are gated/hidden.
// Drop `/blog` and `/about` until those pages exist; otherwise the sitemap
// points at routes that 404.
const publicRoutes = [
  "",
  "/pricing",
  "/features",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
] as const;

// Per-route metadata. Home is dynamic; legal pages are versioned.
// Real dates (not `new Date()` on every build) make the sitemap stable and
// let search engines trust the modification signal.
const ROUTE_META: Record<
  (typeof publicRoutes)[number],
  {
    lastModified: Date;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }
> = {
  "": {
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  },
  "/pricing": {
    lastModified: new Date("2026-07-01"),
    changeFrequency: "weekly",
    priority: 0.9,
  },
  "/features": {
    lastModified: new Date("2026-07-01"),
    changeFrequency: "weekly",
    priority: 0.8,
  },
  "/contact": {
    lastModified: new Date("2026-07-01"),
    changeFrequency: "monthly",
    priority: 0.5,
  },
  "/privacy": {
    lastModified: new Date("2026-07-01"),
    changeFrequency: "yearly",
    priority: 0.3,
  },
  "/terms": {
    lastModified: new Date("2026-07-01"),
    changeFrequency: "yearly",
    priority: 0.3,
  },
  "/cookies": {
    lastModified: new Date("2026-07-01"),
    changeFrequency: "yearly",
    priority: 0.3,
  },
};

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => {
    const meta = ROUTE_META[route];
    return {
      url: `${siteConfig.url}${route}`,
      lastModified: meta.lastModified,
      changeFrequency: meta.changeFrequency,
      priority: meta.priority,
    };
  });
}
