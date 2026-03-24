import type { Redis } from "ioredis";
import { createHash } from "crypto";

export function createDedupe(redis: Redis, ttlSeconds: number) {
  const prefix = "source:dedupe:";

  function hash(items: { title: string; url?: string }[]): string {
    const content = items
      .map((i) => `${i.title}|${i.url ?? ""}`)
      .sort()
      .join("\n");
    return createHash("sha256").update(content).digest("hex");
  }

  return {
    hash,

    async isDuplicate(hashKey: string): Promise<boolean> {
      const k = `${prefix}${hashKey}`;
      const v = await redis.get(k);
      return v != null;
    },

    async markProcessed(hashKey: string): Promise<void> {
      const k = `${prefix}${hashKey}`;
      await redis.set(k, "1", "EX", ttlSeconds);
    },
  };
}
