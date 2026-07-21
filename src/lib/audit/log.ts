import { db } from "@/db";
import { auditLogs, type JsonValue, type NewAuditLog } from "@/db/schema";
import type { AuditAction, AuditResource } from "@/lib/audit/actions";
import { sanitizeMetadata } from "@/lib/audit/sanitize";
import { getClientIp } from "@/lib/security/rate-limit";

/**
 * Append-only audit log writer.
 *
 * Writes one row per security-sensitive action (auth changes, billing events,
 * destructive operations, etc.). Fire-and-forget by design: callers `await`
 * `logAudit(...)` but a failure here must NEVER break the user's request —
 * the helper swallows insert errors and emits a structured console warning
 * instead. (Same posture as the PostHog analytics helper.)
 *
 * Inserts use the Drizzle `db` client directly. The Drizzle connection runs
 * as the postgres role, which bypasses RLS — so writes work even though no
 * INSERT policy exists for authenticated users. Clients therefore cannot
 * forge audit rows.
 */

/**
 * Request-scoped metadata extracted once and passed in. Avoids constructing
 * a synthetic Request object when the caller already has headers (e.g. inside
 * a Server Action via `next/headers`).
 */
export interface RequestContext {
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/** Build a RequestContext from a Web Request (route handler / middleware). */
export function requestContext(request: Request): RequestContext {
  return {
    requestId: request.headers.get("x-request-id"),
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  };
}

export interface AuditLogInput {
  /** auth.users.id of the user who performed the action. Null for system/webhook actors. */
  actorId?: string | null;
  action: AuditAction;
  resourceType: AuditResource;
  /** Opaque id of the affected resource (string for cross-type flexibility). */
  resourceId?: string | null;
  /** Tenant scope when the action is org-scoped. */
  organizationId?: string | null;
  /** Optional request context — request_id, ip, user_agent are recorded when present. */
  request?: RequestContext | null;
  /** Arbitrary structured metadata; sensitive keys are redacted before insert. */
  metadata?: Record<string, unknown> | null;
}

export async function logAudit(input: AuditLogInput): Promise<void> {
  const ctx = input.request ?? {};
  const row: NewAuditLog = {
    actorId: input.actorId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    organizationId: input.organizationId ?? null,
    requestId: ctx.requestId ?? null,
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
    metadata: input.metadata
      ? (sanitizeMetadata(input.metadata) as JsonValue)
      : null,
  };

  try {
    await db.insert(auditLogs).values(row);
  } catch (error) {
    // Audit must never break the calling request. Log and move on.
    console.warn(
      "[audit] failed to write audit log",
      {
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        actorId: input.actorId ?? null,
      },
      error,
    );
  }
}
