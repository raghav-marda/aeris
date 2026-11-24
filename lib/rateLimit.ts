// Minimal in-memory fixed-window rate limiter for the LLM-backed API
// routes. This app is stateless and has no database by design (see
// README), so a fixed-size in-process map is the right tool here — it
// resets on redeploy, which is acceptable for abuse-prevention rather than
// billing enforcement. Each serverless instance enforces its own limit,
// which is a known trade-off and is documented as such in the README.

interface Bucket {
  count: number;
  windowStartMs: number;
}

export interface RateLimitResult {
  readonly limited: boolean;
  /** Whole seconds until the current window ends (for a Retry-After header). */
  readonly retryAfterSeconds: number;
}

export const WINDOW_MS = 60_000; // 1 minute
export const MAX_REQUESTS_PER_WINDOW = 12;
const MAX_BUCKETS = 5000; // cap memory use

const buckets = new Map<string, Bucket>();

const isExpired = (bucket: Bucket, now: number): boolean => now - bucket.windowStartMs >= WINDOW_MS;

/** Makes room for one new key: drops expired windows first, then the oldest key. */
function makeRoom(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (isExpired(bucket, now)) buckets.delete(key);
  }
  if (buckets.size < MAX_BUCKETS) return;
  const oldestKey = buckets.keys().next().value;
  if (oldestKey !== undefined) buckets.delete(oldestKey);
}

/** Counts this request against `key` and reports whether it is over the limit. */
export function checkRateLimit(key: string, now: number = Date.now()): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || isExpired(existing, now)) {
    // Only a brand-new key can grow the map; resetting an old window cannot.
    if (!existing) makeRoom(now);
    buckets.set(key, { count: 1, windowStartMs: now });
    return { limited: false, retryAfterSeconds: Math.ceil(WINDOW_MS / 1000) };
  }

  existing.count += 1;
  const remainingMs = existing.windowStartMs + WINDOW_MS - now;
  return {
    limited: existing.count > MAX_REQUESTS_PER_WINDOW,
    retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
  };
}

export function isRateLimited(key: string, now: number = Date.now()): boolean {
  return checkRateLimit(key, now).limited;
}

export function clientKeyFrom(req: Request): string {
  // Behind Vercel/most proxies this header carries the real client IP.
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
