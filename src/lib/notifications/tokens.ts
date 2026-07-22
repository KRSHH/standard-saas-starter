import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless unsubscribe tokens.
 *
 * HMAC-signed JWT-ish tokens encoding `{ userId, category?, exp }` so the
 * unsubscribe endpoint can validate a click from an email without a database
 * lookup. The secret defaults to a derived value in dev (zero-config) and
 * should be set explicitly via NOTIFICATIONS_UNSUBSCRIBE_SECRET in prod.
 *
 * Format: `<base64url-payload>.<base64url-signature>` (no header — the alg is
 * fixed to HMAC-SHA256).
 */

const ALG = "sha256";
const TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year — unsub links should be durable.

function getSecret(): string {
  const secret = process.env.NOTIFICATIONS_UNSUBSCRIBE_SECRET;
  if (secret) return secret;
  // Fail closed in production — a guessable fallback would let anyone forge
  // unsubscribe tokens for arbitrary users (mirrors the rate-limit policy).
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NOTIFICATIONS_UNSUBSCRIBE_SECRET is required in production",
    );
  }
  // Dev fallback — derived from the service role key if present, else a
  // fixed dev secret. NEVER rely on this in production.
  return `dev-unsubscribe-${process.env.SUPABASE_SERVICE_ROLE_KEY ?? "insecure"}`;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

interface TokenPayload {
  userId: string;
  category?: string;
  exp: number; // unix seconds
}

export function signUnsubscribeToken(input: {
  userId: string;
  category?: string;
}): string {
  const payload: TokenPayload = {
    userId: input.userId,
    ...(input.category ? { category: input.category } : {}),
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = createHmac(ALG, getSecret()).update(payloadB64).digest();
  return `${payloadB64}.${b64url(sig)}`;
}

export function verifyUnsubscribeToken(
  token: string,
): { ok: true; userId: string; category?: string } | { ok: false } {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return { ok: false };

  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  const expected = createHmac(ALG, getSecret()).update(payloadB64).digest();
  const provided = fromB64url(sigB64);
  if (expected.length !== provided.length) return { ok: false };
  if (!timingSafeEqual(expected, provided)) return { ok: false };

  let payload: TokenPayload;
  try {
    payload = JSON.parse(fromB64url(payloadB64).toString("utf8"));
  } catch {
    return { ok: false };
  }
  if (typeof payload.userId !== "string" || typeof payload.exp !== "number") {
    return { ok: false };
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false };

  return {
    ok: true,
    userId: payload.userId,
    ...(payload.category ? { category: payload.category } : {}),
  };
}
