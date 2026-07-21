/**
 * Pure entitlement check — the subscription gate (docs/05 Rule 5, docs/09).
 *
 * Kept in its own module so it can be tested without a database:
 * only trialing + active pass the gate.
 */
export function isEntitled(sub: { status: string } | null): boolean {
  if (!sub) return false;
  return sub.status === "trialing" || sub.status === "active";
}
