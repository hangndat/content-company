import { describe, it, expect } from "vitest";
import { trendTopicFingerprint } from "./topic-fingerprint.js";

describe("trendTopicFingerprint", () => {
  it("is stable for same domain and title casing/spacing", () => {
    const a = trendTopicFingerprint("sports-vn", "  Hello   World  ");
    const b = trendTopicFingerprint("sports-vn", "hello world");
    expect(a).toBe(b);
  });

  it("differs by domain", () => {
    const a = trendTopicFingerprint("a", "topic");
    const b = trendTopicFingerprint("b", "topic");
    expect(a).not.toBe(b);
  });
});
