"use client";

import * as React from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { OAUTH_PROVIDERS } from "@/lib/auth/oauth-providers";
import { unlinkOAuthIdentity } from "@/lib/auth/actions";
import { logAuditClient } from "@/lib/audit/client";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit/actions";

/**
 * Linked identities panel. Lists the user's auth identities (email/password +
 * any OAuth providers) and lets them link more or unlink existing ones.
 *
 * Linking initiates an OAuth redirect that returns to /auth/callback.
 * Unlinking goes through the unlinkOAuthIdentity server action, which guards
 * against removing the last sign-in method.
 */
export function LinkedAccounts({
  identities,
}: {
  identities: {
    id: string;
    provider: string;
    email?: string | null;
  }[];
}) {
  const supabase = createClient();
  const [unlinkingId, setUnlinkingId] = React.useState<string | null>(null);

  const linkedProviderIds = new Set(identities.map((i) => i.provider));
  const linkable = OAUTH_PROVIDERS.filter((p) => !linkedProviderIds.has(p.id));

  const onLink = async (providerId: (typeof OAUTH_PROVIDERS)[number]["id"]) => {
    const { error } = await supabase.auth.linkIdentity({
      provider: providerId,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    // Audit on link-initiate; the browser leaves this page after linkIdentity
    // resolves, so this call is best-effort (queued as a fetch). The
    // /auth/callback handler is the authoritative place to confirm a link.
    void logAuditClient({
      action: AUDIT_ACTIONS.USER_OAUTH_LINKED,
      resourceType: AUDIT_RESOURCES.USER,
      metadata: { provider: String(providerId) },
    });
  };

  const onUnlink = async (identityId: string) => {
    setUnlinkingId(identityId);
    try {
      const result = await unlinkOAuthIdentity(identityId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Account unlinked.");
    } finally {
      setUnlinkingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y rounded-md border">
        {identities.map((identity) => (
          <li
            key={identity.id}
            className="flex items-center justify-between gap-3 p-3 text-sm"
          >
            <div className="flex flex-col">
              <span className="font-medium capitalize">
                {identity.provider}
              </span>
              {identity.email ? (
                <span className="text-muted-foreground text-xs">
                  {identity.email}
                </span>
              ) : null}
            </div>
            {identity.provider === "email" ? (
              <span className="text-muted-foreground text-xs">
                Password sign-in
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUnlink(identity.id)}
                disabled={unlinkingId === identity.id}
              >
                {unlinkingId === identity.id ? "Removing…" : "Unlink"}
              </Button>
            )}
          </li>
        ))}
      </ul>

      {linkable.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm">
            Link a sign-in method:
          </p>
          <div className="flex flex-wrap gap-2">
            {linkable.map((provider) => (
              <Button
                key={provider.id}
                variant="outline"
                size="sm"
                onClick={() => onLink(provider.id)}
              >
                Link {provider.name}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
