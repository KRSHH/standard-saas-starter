import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { emailReplyTo } from "@/lib/email/client";
import { LegalArticle, LegalPageHeading } from "../_components";

// REVIEW — replace the placeholder contact details with your real channels.

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description: `Get in touch with the ${siteConfig.name} team.`,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <LegalArticle>
      <LegalPageHeading>Contact</LegalPageHeading>

      <p>
        Questions, feedback, or support requests are welcome. This is
        placeholder contact information — replace with your real channels before
        shipping.
      </p>

      <h2>Support</h2>
      <p>
        For account or billing questions, sign in and use the in-app support
        option. For anything else, reach the team at{" "}
        <a href={`mailto:${emailReplyTo}`}>{emailReplyTo}</a>.
      </p>

      <h2>Legal</h2>
      <p>
        Legal notices and privacy requests should be sent to the contact address
        above with &ldquo;Legal&rdquo; or &ldquo;Privacy&rdquo; in the subject.
      </p>

      <h2>Security</h2>
      <p>
        To report a security vulnerability, email the address above with the
        subject &ldquo;Security report&rdquo;. Please do not disclose
        vulnerabilities publicly before we have had a chance to respond.
      </p>
    </LegalArticle>
  );
}
