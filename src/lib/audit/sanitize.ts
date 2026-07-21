import type { JsonValue } from "@/db/schema";

/**
 * Strip secrets from arbitrary metadata before it lands in the audit log.
 * Audit metadata is often derived from request bodies and webhook payloads,
 * so we defensively remove any key whose name looks like a credential.
 *
 * This is intentionally conservative — it removes by key NAME only and does
 * not try to detect secret-shaped values (which produces false positives).
 * Callers should still avoid passing sensitive material in the first place.
 */

const SENSITIVE_KEY =
  /password|passwd|secret|token|authorization|api[-_]?key|cookie|session/i;

/**
 * True if a JSON key name should be redacted from audit metadata.
 * Exported for unit testing.
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

/**
 * Deep-clone a JSON value, replacing sensitive-keyed entries with the literal
 * string `"[redacted]"`. Arrays and primitives pass through unchanged.
 *
 * Returns a new object; the input is never mutated.
 */
export function sanitizeMetadata(input: unknown): JsonValue {
  return redact(input) as JsonValue;
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSensitiveKey(k) ? "[redacted]" : redact(v);
    }
    return out;
  }
  return value;
}
