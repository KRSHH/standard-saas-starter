import type { Metadata } from "next";

import { siteConfig } from "@/lib/site";

/**
 * Build per-page Metadata with OG + Twitter defaults.
 * Pass { title, description } for any route segment.
 */
export function buildMetadata({
  title,
  description,
  path,
  image,
  noIndex = false,
}: {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = path ? `${siteConfig.url}${path}` : siteConfig.url;
  const ogImage = image ?? "/opengraph-image";

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
