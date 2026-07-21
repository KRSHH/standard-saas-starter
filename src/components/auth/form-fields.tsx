import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Shared form primitives for auth flows (sign-in, sign-up, forgot/reset
 * password, settings sub-forms). Extracted so every auth surface uses the
 * same Label + Input + error styling without re-declaring it.
 */

export function Field({
  id,
  label,
  error,
  ...props
}: React.ComponentProps<"input"> & {
  id: string;
  label: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

export function SubmitButton({
  isLoading,
  label,
}: {
  isLoading: boolean;
  label: string;
}) {
  return (
    <Button type="submit" disabled={isLoading} className="mt-2">
      {isLoading && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  );
}
