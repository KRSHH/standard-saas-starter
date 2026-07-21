import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = buildMetadata({
  title: "Reset password",
  description: "Choose a new password.",
  path: "/reset-password",
  noIndex: true,
});

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose a new password
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter your new password below.
        </p>
      </div>
      <ResetPasswordForm className="mt-8" />
    </div>
  );
}
