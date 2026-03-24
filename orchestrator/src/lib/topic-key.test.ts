import { describe, it, expect } from "vitest";
import { extractTopicIdentifiers, toTopicKey } from "./topic-key.js";

describe("topic-key", () => {
  it("extracts topic identifiers from outline", () => {
    const outline = "Liverpool Premier League 2024. Key matches and standings.";
    const r = extractTopicIdentifiers(outline);
    expect(r.topicKey).toBeTruthy();
    expect(r.topicLabel).toContain("Liverpool");
    expect(r.topicSignature).toHaveLength(64);
  });

  it("topic_key is slug-like", () => {
    const r = extractTopicIdentifiers("How to build a SaaS product");
    expect(r.topicKey).toMatch(/^[a-z0-9-]+$/);
    expect(r.topicKey).not.toContain(" ");
  });

  it("toTopicKey returns key for backward compat", () => {
    const key = toTopicKey("Test outline here");
    expect(typeof key).toBe("string");
  });
});
