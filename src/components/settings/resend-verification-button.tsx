"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { resendVerificationEmail } from "@/lib/auth/actions";

export function ResendVerificationButton() {
  const [isLoading, setIsLoading] = React.useState(false);
  const onClick = async () => {
    setIsLoading(true);
    try {
      const result = await resendVerificationEmail();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Verification email sent.");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={isLoading}>
      {isLoading ? "Sending…" : "Resend verification"}
    </Button>
  );
}
