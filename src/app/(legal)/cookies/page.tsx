import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import {
  LegalArticle,
  LegalLastUpdated,
  LegalPageHeading,
} from "../_components";

// REVIEW WITH LEGAL COUNSEL — this is placeholder text, not legal advice.

export const metadata: Metadata = buildMetadata({
  title: "Cookie Policy",
  description: `How ${siteConfig.name} uses cookies and similar technologies.`,
  path: "/cookies",
});

const LAST_UPDATED = "July 1, 2026";

export default function CookiesPage() {
  return (
    <LegalArticle>
      <LegalPageHeading>Cookie Policy</LegalPageHeading>
      <LegalLastUpdated date={LAST_UPDATED} />

      <p>
        {siteConfig.name} uses cookies and similar technologies to operate the
        service, remember your session, and understand how the product is used.
        This is placeholder text and must be replaced with a policy reviewed by
        qualified counsel for your jurisdiction.
      </p>

      <h2>Essential cookies</h2>
      <p>
        These are required for the service to function (for example, keeping you
        signed in). They cannot be disabled.
      </p>

      <h2>Analytics cookies</h2>
      <p>
        When enabled, these let us measure product usage and improve the
        service. You can opt out at any time via your browser settings or our
        consent banner where applicable.
      </p>

      <h2>Managing cookies</h2>
      <p>
        Most browsers let you refuse or delete cookies. Disabling essential
        cookies will prevent the service from working correctly.
      </p>
    </LegalArticle>
  );
}
