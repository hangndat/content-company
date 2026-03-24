import { describe, expect, it } from "vitest";
import {
  EMBEDDING_PREVIEW_DIMS,
  refineTrendCandidatesWithEmbeddings,
} from "./embed-refine-trends.js";
import { averageNormalizedEmbeddings, cosineSim, l2Normalize } from "../../lib/trend-embeddings.js";
import type { TrendCandidate } from "../../trends/trend-candidate.js";

describe("trend-embeddings helpers", () => {
  it("cosineSim is 1 for identical vectors", () => {
    const v = l2Normalize([1, 2, 3]);
    expect(cosineSim(v, v)).toBeCloseTo(1, 5);
  });

  it("averageNormalizedEmbeddings matches normalized mean of L2-normalized inputs", () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    const out = averageNormalizedEmbeddings([a, b]);
    expect(out[0]).toBeCloseTo(1 / Math.sqrt(2), 5);
    expect(out[1]).toBeCloseTo(1 / Math.sqrt(2), 5);
    expect(out[2]).toBe(0);
    const norm = Math.sqrt(out[0]! ** 2 + out[1]! ** 2 + out[2]! ** 2);
    expect(norm).toBeCloseTo(1, 5);
  });
});

describe("refineTrendCandidatesWithEmbeddings", () => {
  const opts = {
    mergeThreshold: 0.85,
    maxBodyLength: 3000,
    embeddingModel: "text-embedding-3-small",
    store: "preview" as const,
  };

  it("merges two similar candidates and unions sources", () => {
    const c1: TrendCandidate = {
      topic: "VN thắng Thái Lan 2-1",
      aggregatedBody: "A",
      sources: ["a", "b"],
      sourceCount: 2,
      itemRefs: ["u1"],
      sourceArticles: [{ title: "T1", url: "u1" }],
    };
    const c2: TrendCandidate = {
      topic: "Đội tuyển Việt Nam thắng Thái Lan 2-1",
      aggregatedBody: "B",
      sources: ["c"],
      sourceCount: 1,
      itemRefs: ["u2"],
      sourceArticles: [{ title: "T2", url: "u2" }],
    };
    const e1 = [1, 0, 0, 0];
    const e2 = [0.95, 0.05, 0, 0];
    const out = refineTrendCandidatesWithEmbeddings([c1, c2], [e1, e2], opts);
    expect(out).toHaveLength(1);
    expect(out[0]!.sources.sort()).toEqual(["a", "b", "c"]);
    expect(out[0]!.sourceCount).toBe(3);
    expect(out[0]!.topic).toBe(c1.topic);
    expect(out[0]!.embeddingModel).toBe(opts.embeddingModel);
    expect(out[0]!.embeddingDimensions).toBe(4);
    expect(out[0]!.topicEmbedding).toHaveLength(EMBEDDING_PREVIEW_DIMS);
    expect(out[0]!.sourceArticles?.map((x) => x.title).sort()).toEqual(["T1", "T2"]);
    expect(out[0]!.itemRefs.sort()).toEqual(["u1", "u2"]);
  });

  it("store off omits topicEmbedding", () => {
    const c: TrendCandidate = {
      topic: "x",
      aggregatedBody: "y",
      sources: ["s"],
      sourceCount: 1,
      itemRefs: [],
    };
    const out = refineTrendCandidatesWithEmbeddings([c], [[1, 0, 0]], {
      ...opts,
      store: "off",
    });
    expect(out[0]!.topicEmbedding).toBeUndefined();
    expect(out[0]!.embeddingDimensions).toBe(3);
  });

  it("returns input unchanged when embedding count mismatches", () => {
    const c: TrendCandidate = {
      topic: "x",
      aggregatedBody: "y",
      sources: ["s"],
      sourceCount: 1,
      itemRefs: [],
    };
    const out = refineTrendCandidatesWithEmbeddings([c], [], opts);
    expect(out).toEqual([c]);
  });
});
