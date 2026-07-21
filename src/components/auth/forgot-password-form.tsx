"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Field, SubmitButton } from "@/components/auth/form-fields";

const schema = z.object({
  email: z.email({ message: "Enter a valid email" }),
});

type Values = z.infer<typeof schema>;

/**
 * Forgot-password form. Sends a recovery link via Supabase Auth.
 *
 * The redirect target is `/auth/reset-password` — when the user clicks the
 * link in the email, Supabase exchanges the recovery code for a session via
 * the existing PKCE callback and lands them on the reset-password page.
 */
export function ForgotPasswordForm({ className }: { className?: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: Values) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(
        values.email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        },
      );
      if (error) {
        toast.error(error.message);
        return;
      }
      // Always show success regardless of whether the email exists —
      // avoids leaking which addresses have accounts.
      toast.success("If that email exists, a reset link is on its way.");
      router.push("/check-email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn("flex flex-col gap-4", className)}
    >
      <Field
        id="email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={form.formState.errors.email?.message}
        {...form.register("email")}
      />
      <SubmitButton isLoading={isLoading} label="Send reset link" />
      <Link
        href="/sign-in"
        className="text-muted-foreground hover:text-foreground text-center text-sm"
      >
        Back to sign in
      </Link>
    </form>
  );
}
