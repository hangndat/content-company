import type { Redis } from "ioredis";

export function createLock(redis: Redis, ttlSeconds: number) {
  const prefix = "job:lock:";

  return {
    async acquire(jobId: string, value: string): Promise<boolean> {
      const key = `${prefix}${jobId}`;
      const result = await redis.set(key, value, "EX", ttlSeconds, "NX");
      return result === "OK";
    },

    async release(jobId: string): Promise<void> {
      const key = `${prefix}${jobId}`;
      await redis.del(key);
    },

    async exists(jobId: string): Promise<boolean> {
      const key = `${prefix}${jobId}`;
      const v = await redis.get(key);
      return v != null;
    },
  };
}
