/**
 * Simple in-process token-bucket rate limiter.
 * Works across a single Node.js process (dev + Edge). For multi-instance
 * deployments, replace with Upstash Redis Ratelimit.
 *
 * Usage:
 *   const result = rateLimit('retry', userId, { max: 10, windowMs: 60_000 })
 *   if (!result.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

interface Bucket {
  tokens: number
  lastRefill: number
}

// key → bucket state
const buckets = new Map<string, Bucket>()

// Clean up stale buckets every 5 minutes to prevent memory growth
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) buckets.delete(key)
  }
}, 5 * 60 * 1000)

interface RateLimitOptions {
  /** Maximum requests in the window */
  max: number
  /** Window length in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number // unix ms
}

export function rateLimit(
  scope: string,
  identifier: string,
  { max, windowMs }: RateLimitOptions,
): RateLimitResult {
  const key = `${scope}:${identifier}`
  const now = Date.now()
  let bucket = buckets.get(key)

  if (!bucket || now - bucket.lastRefill >= windowMs) {
    // New window — full refill
    bucket = { tokens: max, lastRefill: now }
  }

  const ok = bucket.tokens > 0
  if (ok) bucket.tokens--
  buckets.set(key, bucket)

  return {
    ok,
    remaining: bucket.tokens,
    resetAt: bucket.lastRefill + windowMs,
  }
}

/** Convenience: returns a 429 JSON response body string */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  }
}
