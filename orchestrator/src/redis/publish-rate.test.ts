import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPublishRateLimit } from "./publish-rate.js";

function createMockRedis() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    incr: vi.fn(async (key: string) => {
      const n = parseInt(store.get(key) ?? "0", 10) + 1;
      store.set(key, String(n));
      return n;
    }),
    expire: vi.fn(async () => 1),
  };
}

describe("createPublishRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("check returns current 0 when key missing", async () => {
    const redis = createMockRedis();
    const rate = createPublishRateLimit(redis as never, 7200, () => 10);
    const { current, limit } = await rate.check("blog-1", "blog");
    expect(current).toBe(0);
    expect(limit).toBe(10);
  });

  it("incr increments and check reflects stored value", async () => {
    const redis = createMockRedis();
    const rate = createPublishRateLimit(redis as never, 7200, () => 5);
    await rate.incr("blog-1");
    const { current, limit } = await rate.check("blog-1", "blog");
    expect(current).toBe(1);
    expect(limit).toBe(5);
  });

  it("uses getLimitForChannel by channelType", async () => {
    const redis = createMockRedis();
    const getLimit = vi.fn((t: string) => (t === "social" ? 3 : 99));
    const rate = createPublishRateLimit(redis as never, 7200, getLimit);
    const r1 = await rate.check("x", "social");
    expect(r1.limit).toBe(3);
    const r2 = await rate.check("x", "blog");
    expect(r2.limit).toBe(99);
  });
});
