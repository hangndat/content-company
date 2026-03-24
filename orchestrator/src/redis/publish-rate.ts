import type { Redis } from "ioredis";

export function createPublishRateLimit(
  redis: Redis,
  ttlSeconds: number,
  getLimitForChannel: (channelType: string) => number
) {
  const prefix = "publish:rate:";

  return {
    async check(channelId: string, channelType: string): Promise<{ current: number; limit: number }> {
      const limit = getLimitForChannel(channelType);
      const bucket = Math.floor(Date.now() / 3600000);
      const key = `${prefix}${channelId}:${bucket}`;
      const current = parseInt((await redis.get(key)) ?? "0", 10);
      return { current, limit };
    },

    async incr(channelId: string): Promise<number> {
      const bucket = Math.floor(Date.now() / 3600000);
      const key = `${prefix}${channelId}:${bucket}`;
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, ttlSeconds);
      }
      return current;
    },
  };
}
