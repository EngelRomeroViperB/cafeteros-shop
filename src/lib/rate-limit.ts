/**
 * Simple in-memory sliding-window rate limiter.
 * Not shared across serverless instances — good enough for basic protection.
 */

const hits = new Map<string, number[]>();

/**
 * Returns `true` if the request is allowed, `false` if rate-limited.
 * @param key   Unique identifier (e.g. "checkout:1.2.3.4")
 * @param limit Max number of requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export function checkRate(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = hits.get(key) ?? [];

  // Remove expired timestamps
  const valid = timestamps.filter((t) => now - t < windowMs);

  if (valid.length >= limit) {
    hits.set(key, valid);
    return false;
  }

  valid.push(now);
  hits.set(key, valid);
  return true;
}

// Periodically clean up stale keys to prevent memory leaks (every 5 min)
if (typeof globalThis !== "undefined") {
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits.entries()) {
      const valid = timestamps.filter((t) => now - t < 120_000);
      if (valid.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, valid);
      }
    }
  }, CLEANUP_INTERVAL).unref?.();
}
