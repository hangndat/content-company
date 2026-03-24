import type { Redis } from "ioredis";
import { createHash } from "crypto";

export function createPublishDedupe(
  redis: Redis,
  ttlSeconds: number
) {
  const prefix = "publish:dedupe:";

  function hashContent(content: string): string {
    const normalized = content.replace(/\s+/g, " ").trim();
    return createHash("sha256").update(normalized).digest("hex");
  }

  return {
    hashContent,

    async isDuplicate(channelId: string, contentHash: string): Promise<boolean> {
      const key = `${prefix}${channelId}:${contentHash}`;
      const v = await redis.get(key);
      return v != null;
    },

    async markPublished(channelId: string, contentHash: string): Promise<void> {
      const key = `${prefix}${channelId}:${contentHash}`;
      await redis.set(key, "1", "EX", ttlSeconds);
    },
  };
}
