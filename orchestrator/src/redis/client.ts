import { Redis } from "ioredis";
import type { Logger } from "pino";

let redis: Redis | null = null;

export function getRedis(url: string, logger?: Logger): Redis {
  if (!redis) {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      lazyConnect: true,
    });
    redis.on("error", (err: Error) => {
      logger?.error({ err }, "Redis connection error");
    });
  }
  return redis;
}

/** BullMQ connection options: maxRetriesPerRequest must be null for workers. */
export function getBullMQConnectionOptions(url: string) {
  return {
    url,
    maxRetriesPerRequest: null as null,
    retryStrategy(times: number) {
      return Math.min(times * 100, 3000);
    },
  };
}
