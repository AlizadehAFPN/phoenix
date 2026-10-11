import "server-only";

/**
 * Rate limiting behind an interface (BRIEF §3: Vercel-only features stay
 * behind an interface so the site moves to the owner's server unchanged).
 *
 * The default is an in-memory sliding window. On a serverless platform each
 * instance has its own memory, so it limits per instance rather than
 * globally; that is still enough to stop a single client looping the form,
 * and Turnstile is the real gate. A shared store (Vercel's firewall rate
 * limiting, or Redis on the owner's server) implements the same interface.
 */

export interface RateLimiter {
  /** Whether `key` may proceed now. Records the attempt if so. */
  allow(key: string): Promise<boolean>;
}

export function memoryRateLimiter(
  limit: number,
  windowMs: number,
): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    allow(key) {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return Promise.resolve(false);
      }
      recent.push(now);
      hits.set(key, recent);
      /* Keep the map from growing without bound under a scan. */
      if (hits.size > 10_000) {
        for (const [k, v] of hits) {
          if (v.every((t) => now - t >= windowMs)) hits.delete(k);
        }
      }
      return Promise.resolve(true);
    },
  };
}
