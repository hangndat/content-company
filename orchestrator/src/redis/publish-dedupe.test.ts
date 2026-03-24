import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPublishDedupe } from "./publish-dedupe.js";

function createMockRedis() {
  const store = new Map<string, string>();
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, val: string, ..._rest: unknown[]) => {
      store.set(key, val);
    }),
  };
}

describe("createPublishDedupe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hashContent normalizes whitespace and hashes deterministically", () => {
    const redis = createMockRedis();
    const dedupe = createPublishDedupe(redis as never, 3600);
    const a = dedupe.hashContent("hello   world\n");
    const b = dedupe.hashContent(" hello world ");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("isDuplicate returns false when key missing", async () => {
    const redis = createMockRedis();
    const dedupe = createPublishDedupe(redis as never, 3600);
    await expect(dedupe.isDuplicate("ch1", "abc")).resolves.toBe(false);
  });

  it("markPublished then isDuplicate is true", async () => {
    const redis = createMockRedis();
    const dedupe = createPublishDedupe(redis as never, 3600);
    await dedupe.markPublished("ch1", "hash1");
    await expect(dedupe.isDuplicate("ch1", "hash1")).resolves.toBe(true);
    await expect(dedupe.isDuplicate("ch2", "hash1")).resolves.toBe(false);
  });
});
