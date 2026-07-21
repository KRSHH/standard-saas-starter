import type { Metadata } from "next";
import Link from "next/link";

import { buildMetadata } from "@/lib/seo";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = buildMetadata({
  title: "Sign in",
  description: "Sign in to your account.",
  path: "/sign-in",
  noIndex: true,
});

export default function SignInPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Sign in to your account</p>
      </div>
      <AuthForm mode="sign-in" className="mt-8" />
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link
          href="/auth/sign-up"
          className="text-foreground font-medium hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
