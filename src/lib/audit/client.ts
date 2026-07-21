"use server";

import { headers } from "next/headers";

import { logAudit, type RequestContext } from "@/lib/audit/log";
import type { AuditAction, AuditResource } from "@/lib/audit/actions";
import { createClient } from "@/lib/supabase/server";

/**
 * Client-callable audit entry point. Browser flows (password change, email
 * change, OAuth link/unlink) call Supabase directly via the SSR browser
 * client — those mutations happen outside our server code, so we expose this
 * server action for the client to record the audit row after a successful
 * client-side mutation. The server re-derives actor + request metadata from
 * the cookie session, so a malicious client can only choose the action +
 * metadata (which are validated types), not forge actorId.
 */
export async function logAuditClient(input: {
  action: AuditAction;
  resourceType: AuditResource;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const h = await headers();
  const ctx: RequestContext = {
    requestId: h.get("x-request-id"),
    userAgent: h.get("user-agent"),
    // x-forwarded-for is the first hop; getClientIp reads it but headers()
    // gives us a plain Headers we can read directly here.
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
  };

  await logAudit({
    actorId: user?.id ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    metadata: input.metadata ?? null,
    request: ctx,
  });
}
