import { configuredExternalLinks, siteConfig } from "@/lib/site";

/**
 * JSON-LD structured data for SEO.
 * Uses native <script type="application/ld+json"> (not next/script) per Next docs.
 * The `</g → \u003c` escape prevents XSS from injected content.
 *
 * @see https://nextjs.org/docs/app/guides/json-ld
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\u003c"),
      }}
    />
  );
}

/** Organization schema — used on the homepage + footer. */
export function organizationSchema() {
  const sameAs = configuredExternalLinks();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    logo: `${siteConfig.url}/icon.svg`,
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/** WebSite schema — enables sitelinks search box in Google results. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: "en-US",
  };
}
