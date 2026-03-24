import { describe, it, expect } from "vitest";
import { decide } from "./routing.js";
import type { GraphState } from "./types.js";

describe("routing", () => {
  const baseState: GraphState = {
    jobId: "test",
    traceId: "test",
    sourceType: "rss",
    rawItems: [],
    publishPolicy: "auto",
    channel: { id: "1", type: "blog", metadata: {} },
    normalizedItems: [],
  };

  it("rejects when topicScore < 0.4", () => {
    expect(decide({ ...baseState, topicScore: 0.3, reviewScore: 0.8 })).toBe("REJECTED");
  });

  it("rejects when reviewScore < 0.5", () => {
    expect(decide({ ...baseState, topicScore: 0.6, reviewScore: 0.4 })).toBe("REJECTED");
  });

  it("approves when scores above threshold", () => {
    expect(decide({ ...baseState, topicScore: 0.7, reviewScore: 0.8 })).toBe("APPROVED");
  });

  it("returns REVIEW_REQUIRED for review_only policy", () => {
    expect(decide({ ...baseState, publishPolicy: "review_only", topicScore: 0.9, reviewScore: 0.9 })).toBe(
      "REVIEW_REQUIRED"
    );
  });
});
