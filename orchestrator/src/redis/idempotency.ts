import type { Redis } from "ioredis";

export function createIdempotency(redis: Redis, ttlSeconds: number) {
  const prefix = "job:idempotency:";

  return {
    async get(key: string): Promise<string | null> {
      const k = `${prefix}${key}`;
      return redis.get(k);
    },

    async set(key: string, jobId: string): Promise<void> {
      const k = `${prefix}${key}`;
      await redis.set(k, jobId, "EX", ttlSeconds);
    },
  };
}
