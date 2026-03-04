import { appEnv } from "@/lib/env";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export class RateLimitExceededError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super("Rate limit exceeded.");
  }
}

export function assertWithinRateLimit(key: string) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + appEnv.analyzeRateLimitWindowMs
    });
    return;
  }

  if (existing.count >= appEnv.analyzeRateLimitMax) {
    throw new RateLimitExceededError(existing.resetAt - now);
  }

  existing.count += 1;
}
