import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

// Public marketing routes only — app/auth/api are gated/hidden.
const publicRoutes = [
  "",
  "/pricing",
  "/features",
  "/blog",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return publicRoutes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/pricing" ? 0.9 : 0.7,
  }));
}
