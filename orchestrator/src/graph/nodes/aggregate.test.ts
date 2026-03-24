import { describe, expect, it } from "vitest";
import { clusterItemsBySimilarity, groupsToTrendCandidates } from "./aggregate.js";

type Row = { id: string; title: string; body: string; sourceId: string };

describe("clusterItemsBySimilarity", () => {
  it("merges transitive pairs", () => {
    const items: Row[] = [
      { id: "a", title: "x", body: "b", sourceId: "s1" },
      { id: "b", title: "y", body: "b", sourceId: "s2" },
      { id: "c", title: "z", body: "b", sourceId: "s3" },
    ];
    const groups = clusterItemsBySimilarity(items, (i, j) => i === 0 && j === 1);
    expect(groups).toHaveLength(2);
    const sizes = groups.map((g) => g.length).sort();
    expect(sizes).toEqual([1, 2]);
  });
});

describe("groupsToTrendCandidates", () => {
  it("drops groups below minSources", () => {
    const items: Row[] = [{ id: "a", title: "t", body: "body", sourceId: "only" }];
    const c = groupsToTrendCandidates([items], 2, 1000);
    expect(c).toHaveLength(0);
  });

  it("keeps multi-source group", () => {
    const g: Row[] = [
      { id: "a", title: "same story", body: "b1", sourceId: "s1" },
      { id: "b", title: "same story paraphrase", body: "b2", sourceId: "s2" },
    ];
    const c = groupsToTrendCandidates([g], 2, 1000);
    expect(c).toHaveLength(1);
    expect(c[0]!.sourceCount).toBe(2);
    expect(c[0]!.sources).toEqual(["s1", "s2"]);
    expect(c[0]!.sourceArticles).toHaveLength(2);
    expect(c[0]!.sourceArticles?.map((x) => x.title)).toEqual(["same story", "same story paraphrase"]);
  });
});
