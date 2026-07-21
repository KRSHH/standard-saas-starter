import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Distributed rate limiting in production, with an explicitly development-only
 * in-memory fallback.
 *
 * Usage in a route handler:
 *   const { limited, headers } = await rateLimit(request, { namespace: "sign-in", limit: 10, window: 60 });
 *   if (limited) return NextResponse.json(..., { status: 429, headers });
 */

type RateLimitOptions = {
  /** Key namespace (e.g. "sign-in", "chat"). */
  namespace: string;
  /** Max requests per window. */
  limit: number;
  /** Window size in seconds. */
  window: number;
};

type RateLimitResult = {
  limited: boolean;
  remaining: number;
  reset: number; // unix seconds
};

// ---- In-memory store (dev / single-instance) ----
const memory = new Map<string, { count: number; resetAt: number }>();

const distributedLimiters = new Map<string, Ratelimit>();

// Garbage-collect expired development entries periodically.
let lastGc = 0;
function gc(now: number) {
  if (now - lastGc < 60) return;
  lastGc = now;
  for (const [k, v] of memory) {
    if (v.resetAt <= now) memory.delete(k);
  }
}

function inMemoryCheck(
  key: string,
  limit: number,
  windowSec: number,
): RateLimitResult {
  const now = Math.floor(Date.now() / 1000);
  gc(now);
  const existing = memory.get(key);
  const reset = existing ? existing.resetAt : now + windowSec;

  if (!existing || existing.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: reset });
    return { limited: false, remaining: limit - 1, reset };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { limited: true, remaining: 0, reset: existing.resetAt };
  }
  return { limited: false, remaining: limit - existing.count, reset };
}

/**
 * Check the rate limit for a request. Production fails closed when Upstash is
 * not configured; only non-production environments use the per-process fallback.
 */
export async function rateLimit(
  request: Request,
  opts: RateLimitOptions,
): Promise<{ limited: boolean; headers: Record<string, string> }> {
  const ip = getClientIp(request);
  const key = `${opts.namespace}:${ip}`;

  const hasUpstash =
    Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
    Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

  let result: RateLimitResult;
  if (hasUpstash) {
    const limiterKey = `${opts.namespace}:${opts.limit}:${opts.window}`;
    let limiter = distributedLimiters.get(limiterKey);
    if (!limiter) {
      limiter = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(opts.limit, `${opts.window} s`),
        prefix: `ratelimit:${opts.namespace}`,
      });
      distributedLimiters.set(limiterKey, limiter);
    }
    const distributed = await limiter.limit(ip);
    result = {
      limited: !distributed.success,
      remaining: distributed.remaining,
      reset: Math.ceil(distributed.reset / 1000),
    };
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production",
      );
    }
    result = inMemoryCheck(key, opts.limit, opts.window);
  }

  const headers: Record<string, string> = {
    "RateLimit-Limit": String(opts.limit),
    "RateLimit-Remaining": String(Math.max(0, result.remaining)),
    "RateLimit-Reset": String(result.reset),
    "Retry-After": String(
      Math.max(1, result.reset - Math.floor(Date.now() / 1000)),
    ),
  };

  return { limited: result.limited, headers };
}

/**
 * Extract the client IP from request headers. Honors `x-forwarded-for`
 * (first hop) then `x-real-ip`, falling back to `"unknown"`. Exported so
 * audit logging and other security helpers reuse the same resolution.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
