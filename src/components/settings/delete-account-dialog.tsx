"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ReauthenticateDialog } from "@/components/settings/reauthenticate-dialog";
import { deleteAccount } from "@/lib/auth/actions";

/**
 * Delete-account dialog. Requires fresh reauthentication (the reauth dialog
 * opens first); after the user verifies, the destructive server action runs.
 *
 * The server action handles audit logging before deletion and signs the
 * browser out.
 */
export function DeleteAccountDialog({ email }: { email: string }) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [reauthOpen, setReauthOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const onConfirmReauth = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteAccount();
      if (!result.ok) {
        toast.error(result.error);
      }
      // On success deleteAccount redirects — no state to update.
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            Delete account
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your account and all associated data —
              organizations, subscriptions, and uploads. This cannot be undone.
              You&apos;ll be asked to confirm your identity first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false);
                setReauthOpen(true);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReauthenticateDialog
        open={reauthOpen}
        onOpenChange={setReauthOpen}
        email={email}
        onSuccess={onConfirmReauth}
      />
    </>
  );
}
