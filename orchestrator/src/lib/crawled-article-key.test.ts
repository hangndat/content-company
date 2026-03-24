import { describe, it, expect } from "vitest";
import { crawledArticleDedupeKey } from "./crawled-article-key.js";

describe("crawledArticleDedupeKey", () => {
  it("uses URL when present", () => {
    const a = crawledArticleDedupeKey("sports-vn", {
      title: "Different",
      url: "https://example.com/a",
      body: "x",
    });
    const b = crawledArticleDedupeKey("sports-vn", {
      title: "Other title",
      url: "https://example.com/a",
      body: "y",
    });
    expect(a).toBe(b);
  });

  it("falls back to title+body when no URL", () => {
    const a = crawledArticleDedupeKey("d", { title: "Hello", body: "body content here" });
    const b = crawledArticleDedupeKey("d", { title: "Hello", body: "body content here" });
    expect(a).toBe(b);
  });
});
