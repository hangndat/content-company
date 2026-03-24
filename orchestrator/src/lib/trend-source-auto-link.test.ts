import { describe, expect, it } from "vitest";
import { feedPathPrefix, resolveTrendSourceIdForArticleUrl } from "./trend-source-auto-link.js";

describe("feedPathPrefix", () => {
  it("strips .rss and normalizes host", () => {
    expect(feedPathPrefix("https://www.Vnexpress.net/rss/the-thao.rss")).toEqual({
      host: "vnexpress.net",
      prefix: "/rss/the-thao",
    });
  });
});

describe("resolveTrendSourceIdForArticleUrl", () => {
  const feeds = [
    { id: "a", host: "vnexpress.net", prefix: "/rss/the-thao" },
    { id: "b", host: "bongda.com.vn", prefix: "/viet-nam" },
    { id: "c", host: "bongda.com.vn", prefix: "/bong-da-anh" },
    { id: "d", host: "bongda.com.vn", prefix: "/feed" },
  ];

  it("uses sole feed on host", () => {
    expect(resolveTrendSourceIdForArticleUrl("https://vnexpress.net/the-thao/foo", feeds)).toBe("a");
  });

  it("picks longest path prefix on multi-feed host", () => {
    expect(resolveTrendSourceIdForArticleUrl("https://bongda.com.vn/bong-da-anh/tin-1", feeds)).toBe("c");
    expect(resolveTrendSourceIdForArticleUrl("https://bongda.com.vn/viet-nam/tin-2", feeds)).toBe("b");
  });

  it("falls back to sole /feed source when path matches nothing else", () => {
    expect(resolveTrendSourceIdForArticleUrl("https://bongda.com.vn/khac/tin", feeds)).toBe("d");
  });
});
