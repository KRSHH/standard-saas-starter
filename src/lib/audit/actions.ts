/**
 * Typed registry of audit actions — the canonical vocabulary used across the
 * app. Always import from here instead of inlining string literals so renames
 * and typos surface at compile time.
 *
 * Convention: `<resource>.<verb>` in snake_case at the DB level, mirrored as
 * `RESOURCE_VERB` constants here. Examples:
 *   user.password.changed   → USER_PASSWORD_CHANGED
 *   org.member.removed      → ORG_MEMBER_REMOVED
 *   billing.subscription.updated → BILLING_SUBSCRIPTION_UPDATED
 */
export const AUDIT_ACTIONS = {
  // Auth lifecycle
  USER_SIGNED_IN: "user.signed_in",
  USER_SIGNED_OUT: "user.signed_out",
  USER_SIGNED_UP: "user.signed_up",
  USER_EMAIL_VERIFIED: "user.email.verified",
  USER_PASSWORD_CHANGED: "user.password.changed",
  USER_EMAIL_CHANGE_REQUESTED: "user.email_change.requested",
  USER_EMAIL_CHANGED: "user.email.changed",
  USER_REAUTHENTICATED: "user.reauthenticated",
  USER_PROFILE_UPDATED: "user.profile.updated",
  USER_OAUTH_LINKED: "user.oauth.linked",
  USER_OAUTH_UNLINKED: "user.oauth.unlinked",
  USER_ACCOUNT_DELETED: "user.account.deleted",

  // Notifications
  NOTIFICATION_DISPATCHED: "notification.dispatched",
  NOTIFICATION_EMAIL_SUPPRESSED: "notification.email.suppressed",
  NOTIFICATION_UNSUBSCRIBED: "notification.unsubscribed",
  NOTIFICATION_EMAIL_BOUNCED: "notification.email.bounced",
  NOTIFICATION_EMAIL_COMPLAINED: "notification.email.complained",

  // Billing
  BILLING_SUBSCRIPTION_UPDATED: "billing.subscription.updated",

  // Uploads
  UPLOAD_CREATED: "upload.created",
  UPLOAD_DELETED: "upload.deleted",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Canonical resource types — kept narrow so audit queries and dashboards can
 * switch exhaustively. Extend with new domain resources as they're added.
 */
export const AUDIT_RESOURCES = {
  USER: "user",
  ORGANIZATION: "organization",
  SUBSCRIPTION: "subscription",
  NOTIFICATION: "notification",
  UPLOAD: "upload",
  WEBHOOK: "webhook",
} as const;

export type AuditResource =
  (typeof AUDIT_RESOURCES)[keyof typeof AUDIT_RESOURCES];
