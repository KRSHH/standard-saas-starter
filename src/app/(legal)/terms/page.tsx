import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import {
  LegalArticle,
  LegalLastUpdated,
  LegalPageHeading,
} from "../_components";

// REVIEW WITH LEGAL COUNSEL — this is placeholder text, not legal advice.
// Replace with terms reviewed for your company and jurisdiction before going
// live. Bump the version date below on every material edit.

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description: `The terms that govern your use of ${siteConfig.name}.`,
  path: "/terms",
});

const LAST_UPDATED = "July 1, 2026";

export default function TermsPage() {
  return (
    <LegalArticle>
      <LegalPageHeading>Terms of Service</LegalPageHeading>
      <LegalLastUpdated date={LAST_UPDATED} />

      <p>
        These Terms of Service govern your access to and use of{" "}
        {siteConfig.name}. By using the service you agree to these terms. This
        is placeholder text and must be replaced with terms reviewed by
        qualified counsel for your jurisdiction.
      </p>

      <h2>Accounts</h2>
      <p>
        You are responsible for safeguarding your account credentials and for
        all activity that occurs under your account. Notify us immediately of
        any unauthorized use.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You agree not to misuse the service, including by disrupting its
        operation, attempting to gain unauthorized access, or using it to
        violate any law or third-party right.
      </p>

      <h2>Subscriptions and billing</h2>
      <p>
        Paid plans are billed on a recurring basis until canceled. We may change
        pricing with reasonable advance notice. Refunds are handled in line with
        our refund policy and applicable law.
      </p>

      <h2>Termination</h2>
      <p>
        We may suspend or terminate access if you violate these terms. You may
        close your account at any time from your account settings.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent to the contact address listed on
        our <a href="/contact">contact page</a>.
      </p>
    </LegalArticle>
  );
}
