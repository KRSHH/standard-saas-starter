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

const schema = z.object({
  newEmail: z.email({ message: "Enter a valid email" }),
});

type Values = z.infer<typeof schema>;

/**
 * Change-email form. Supabase sends a confirmation to the NEW address; the
 * change only takes effect when the user clicks the link (handled by the
 * existing /auth/callback). The current session keeps the old email until
 * then — `user.new_email` / `user.email_change_sent_at` indicate a pending
 * change.
 *
 * On `reauthentication_needed`, opens the ReauthenticateDialog and retries
 * with the nonce.
 */
export function ChangeEmailForm({
  email,
  pendingNewEmail,
}: {
  email: string;
  pendingNewEmail?: string | null;
}) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<Values | null>(null);
  const [reauthOpen, setReauthOpen] = React.useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { newEmail: "" },
  });

  const applyChange = async (values: Values, nonce?: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({
      email: values.newEmail,
      ...(nonce ? { nonce } : {}),
    });
    if (error) {
      if (error.code === "reauthentication_needed") {
        setPendingValues(values);
        setReauthOpen(true);
        return false;
      }
      toast.error(error.message);
      return false;
    }
    await logAuditClient({
      action: AUDIT_ACTIONS.USER_EMAIL_CHANGE_REQUESTED,
      resourceType: AUDIT_RESOURCES.USER,
      metadata: { from: email, to: data.user?.email ?? values.newEmail },
    });
    toast.success(
      `Confirmation sent to ${values.newEmail}. Click the link there to finish.`,
    );
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
      {pendingNewEmail ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
          A change to{" "}
          <span className="text-foreground font-medium">{pendingNewEmail}</span>{" "}
          is pending confirmation.
        </p>
      ) : null}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <Field
          id="newEmail"
          label="New email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.newEmail?.message}
          {...form.register("newEmail")}
        />
        <SubmitButton isLoading={isLoading} label="Send change confirmation" />
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
