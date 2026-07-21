import type { Metadata } from "next";
import Link from "next/link";

import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Check your email",
  description: "Verification link sent.",
  path: "/check-email",
  noIndex: true,
});

/**
 * Landing shown after sign-up, password-reset request, or email-verification
 * resend. Confirms an action email is on the way without leaking whether the
 * address has an account.
 */
export default function CheckEmailPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Check your email
        </h1>
        <p className="text-muted-foreground text-sm">
          If an account exists for that address, we&apos;ve sent a link. Click
          it to continue.
        </p>
      </div>
      <p className="text-muted-foreground mt-8 text-center text-sm">
        Already confirmed?{" "}
        <Link
          href="/sign-in"
          className="text-foreground font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
