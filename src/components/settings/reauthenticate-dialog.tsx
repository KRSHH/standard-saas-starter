"use client";

import * as React from "react";
import { toast } from "sonner";
import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { logAuditClient } from "@/lib/audit/client";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit/actions";

/**
 * Reauthentication dialog.
 *
 * Used before sensitive operations (password change, email change, account
 * deletion) when Supabase returns `reauthentication_needed`. Flow:
 *   1. Caller opens the dialog → we call `supabase.auth.reauthenticate()`
 *      which emails a 6-digit OTP to the user's address.
 *   2. User enters the code.
 *   3. `verifyOtp({ type: "reauthentication", email, token })` bumps the
 *      session's AAL. The code is then handed back to the caller as a `nonce`
 *      to pass to `updateUser({ ..., nonce })`.
 *
 * @param email — needed because verifyOtp requires it; supplied by caller.
 * @param onSuccess(nonce) — invoked with the verified OTP code as the nonce.
 */
export function ReauthenticateDialog({
  open,
  onOpenChange,
  email,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onSuccess: (nonce: string) => void;
}) {
  const [code, setCode] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [otpSent, setOtpSent] = React.useState(false);

  // Send the OTP when the dialog opens. Idempotent — re-send on demand.
  const sendOtp = React.useCallback(async () => {
    setIsSending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.reauthenticate();
      if (error) {
        toast.error(error.message);
        return;
      }
      setOtpSent(true);
      toast.success("We sent a 6-digit code to your email.");
    } finally {
      setIsSending(false);
    }
  }, []);

  // Send the OTP when the dialog opens. This is a legitimate side-effect of
  // the dialog becoming visible (analogous to focusing an input on mount).
  // The lint rule can't tell that sendOtp only mutates state in response to
  // a user-driven open transition, so we suppress it here deliberately.
  React.useEffect(() => {
    if (open && !otpSent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void sendOtp();
    }
    if (!open) {
      setCode("");
      setOtpSent(false);
    }
  }, [open, otpSent, sendOtp]);

  const onVerify = async () => {
    if (code.length !== 6) return;
    setIsVerifying(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        type: "reauthentication",
        email,
        token: code,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      await logAuditClient({
        action: AUDIT_ACTIONS.USER_REAUTHENTICATED,
        resourceType: AUDIT_RESOURCES.USER,
      });
      toast.success("Reauthenticated.");
      onOpenChange(false);
      onSuccess(code); // the code IS the nonce for updateUser.
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm it&apos;s you</DialogTitle>
          <DialogDescription>
            For your security, we need to verify it&apos;s really you before
            this change. We sent a 6-digit code to{" "}
            <span className="text-foreground font-medium">{email}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-4">
          <OTPInput
            value={code}
            onChange={setCode}
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
            onComplete={onVerify}
            containerClassName="justify-center"
            render={({ slots }) => <OtpSlots slots={slots} />}
          />
          <button
            type="button"
            onClick={sendOtp}
            disabled={isSending}
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline disabled:opacity-50"
          >
            {isSending ? "Sending…" : "Resend code"}
          </button>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isVerifying}
          >
            Cancel
          </Button>
          <Button
            onClick={onVerify}
            disabled={isVerifying || code.length !== 6}
          >
            {isVerifying ? "Verifying…" : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Render a row of 6 OTP slots with the active caret and entered digits. */
function OtpSlots({
  slots,
}: {
  slots: { char: string | null; hasFakeCaret: boolean; isActive: boolean }[];
}) {
  return (
    <div className="flex gap-2">
      {slots.map((slot, idx) => (
        <div
          key={idx}
          className="border-input bg-background flex size-10 items-center justify-center rounded-md border text-center text-lg font-medium"
        >
          {slot.char ?? (slot.hasFakeCaret ? <FakeCaret /> : null)}
        </div>
      ))}
    </div>
  );
}

function FakeCaret() {
  return <div className="bg-foreground h-4 w-px animate-pulse" aria-hidden />;
}
