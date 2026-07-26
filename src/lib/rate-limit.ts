import { AuthError } from "@/lib/auth/session";

type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as unknown as {
  __repairoRateLimit?: Map<string, Bucket>;
};

function store() {
  if (!globalStore.__repairoRateLimit) {
    globalStore.__repairoRateLimit = new Map();
  }
  return globalStore.__repairoRateLimit;
}

/**
 * Simple in-memory rate limit (per Railway instance).
 * Good enough for MVP; swap for Redis when you scale.
 */
export function rateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const map = store();
  const existing = map.get(options.key);

  if (!existing || existing.resetAt <= now) {
    map.set(options.key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true as const, remaining: options.limit - 1 };
  }

  if (existing.count >= options.limit) {
    return {
      ok: false as const,
      remaining: 0,
      retryAfterMs: existing.resetAt - now,
    };
  }

  existing.count += 1;
  return { ok: true as const, remaining: options.limit - existing.count };
}

export function assertRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const result = rateLimit(options);
  if (!result.ok) {
    const secs = Math.ceil(result.retryAfterMs / 1000);
    throw new AuthError(`Rate limit exceeded. Try again in ${secs}s.`, 429);
  }
  return result;
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}
