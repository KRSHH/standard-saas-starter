"use client";

import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createClient } from "@/lib/supabase/client";
import { Field, SubmitButton } from "@/components/auth/form-fields";
import { ReauthenticateDialog } from "@/components/settings/reauthenticate-dialog";
import { logAuditClient } from "@/lib/audit/client";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit/actions";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

/**
 * Change-password form. On `reauthentication_needed` from updateUser, opens
 * the ReauthenticateDialog and retries with the nonce (the OTP the user
 * entered) supplied alongside the new password.
 */
export function ChangePasswordForm({ email }: { email: string }) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<Values | null>(null);
  const [reauthOpen, setReauthOpen] = React.useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const applyChange = async (values: Values, nonce?: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.newPassword,
      ...(nonce ? { nonce } : {}),
    });
    if (error) {
      if (error.code === "reauthentication_needed") {
        // Surface reauth; remember values so we can retry after the nonce lands.
        setPendingValues(values);
        setReauthOpen(true);
        return false;
      }
      toast.error(error.message);
      return false;
    }
    await logAuditClient({
      action: AUDIT_ACTIONS.USER_PASSWORD_CHANGED,
      resourceType: AUDIT_RESOURCES.USER,
    });
    toast.success("Password updated.");
    form.reset();
    return true;
  };

  const onSubmit = async (values: Values) => {
    setIsLoading(true);
    try {
      await applyChange(values);
    } finally {
      setIsLoading(false);
    }
  };

  const onReauthSuccess = async (nonce: string) => {
    if (!pendingValues) return;
    setIsLoading(true);
    try {
      const ok = await applyChange(pendingValues, nonce);
      if (ok) setPendingValues(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <Field
          id="newPassword"
          label="New password"
          type="password"
          autoComplete="new-password"
          error={form.formState.errors.newPassword?.message}
          {...form.register("newPassword")}
        />
        <Field
          id="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={form.formState.errors.confirmPassword?.message}
          {...form.register("confirmPassword")}
        />
        <SubmitButton isLoading={isLoading} label="Update password" />
      </form>

      <ReauthenticateDialog
        open={reauthOpen}
        onOpenChange={(o) => {
          setReauthOpen(o);
          if (!o) setPendingValues(null);
        }}
        email={email}
        onSuccess={onReauthSuccess}
      />
    </>
  );
}
