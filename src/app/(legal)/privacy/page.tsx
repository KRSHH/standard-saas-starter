import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import {
  LegalArticle,
  LegalLastUpdated,
  LegalPageHeading,
} from "../_components";

// REVIEW WITH LEGAL COUNSEL — this is placeholder text, not legal advice.
// Replace with policy copy reviewed for your company and jurisdiction before
// going live. The version date below should be bumped on every material edit.

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: `How ${siteConfig.name} collects, uses, and protects your data.`,
  path: "/privacy",
});

const LAST_UPDATED = "July 1, 2026";

export default function PrivacyPage() {
  return (
    <LegalArticle>
      <LegalPageHeading>Privacy Policy</LegalPageHeading>
      <LegalLastUpdated date={LAST_UPDATED} />

      <p>
        This Privacy Policy describes how {siteConfig.name} (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;) collects, uses, and shares information when you use
        our website and services. This is placeholder text and must be replaced
        with a policy reviewed by qualified counsel for your jurisdiction.
      </p>

      <h2>Information we collect</h2>
      <p>
        We collect information you provide directly (such as your name and email
        when you create an account), and information collected automatically
        (such as usage logs, IP address, and device information).
      </p>

      <h2>How we use information</h2>
      <p>
        We use information to provide and maintain the service, to communicate
        with you, to detect and prevent abuse, and to comply with legal
        obligations.
      </p>

      <h2>Sharing</h2>
      <p>
        We share information with service providers who process data on our
        behalf (hosting, payments, email delivery, analytics), as required by
        law, and in connection with a business transfer. See our Subprocessors
        page for the current list.
      </p>

      <h2>Your choices</h2>
      <p>
        You can access, update, or delete your account data from your account
        settings. You can opt out of marketing communications using the
        unsubscribe link in any email.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can be sent to the contact address listed on
        our <a href="/contact">contact page</a>.
      </p>
    </LegalArticle>
  );
}
