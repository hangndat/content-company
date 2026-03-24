import type { GraphState, NormalizedItem } from "../types.js";
import { jaccardSimilarity } from "../../lib/jaccard.js";
import { getTrendDomainProfile, resolveTrendSourceId } from "../../trends/domain-profiles.js";

export type TrendCandidate = {
  topic: string;
  aggregatedBody: string;
  sources: string[];
  sourceCount: number;
  itemRefs: string[];
};

type ItemWithSource = NormalizedItem & { sourceId: string };

function unionFind<T>(items: T[], similar: (a: T, b: T) => boolean): Map<string, T[]> {
  const parent = new Map<string, string>();
  const getKey = (item: T) => (item as { id: string }).id;

  for (const item of items) {
    parent.set(getKey(item), getKey(item));
  }

  function find(x: string): string {
    const p = parent.get(x)!;
    if (p !== x) {
      parent.set(x, find(p));
    }
    return parent.get(x)!;
  }

  function union(a: T, b: T): void {
    const ra = find(getKey(a));
    const rb = find(getKey(b));
    if (ra !== rb) parent.set(ra, rb);
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (similar(items[i]!, items[j]!)) {
        union(items[i]!, items[j]!);
      }
    }
  }

  const groups = new Map<string, T[]>();
  for (const item of items) {
    const root = find(getKey(item));
    const list = groups.get(root) ?? [];
    list.push(item);
    groups.set(root, list);
  }
  return groups;
}

export function aggregate(state: GraphState): { trendCandidates: TrendCandidate[] } {
  const items = state.normalizedItems;
  if (items.length === 0) {
    return { trendCandidates: [] };
  }

  const profile = getTrendDomainProfile(state.trendDomain);
  const { jaccardThreshold, minSources, maxBodyLength } = profile;

  const itemsWithSource: ItemWithSource[] = items.map((i) => ({
    ...i,
    sourceId: resolveTrendSourceId(state.trendDomain, i.url, i.sourceId),
  }));

  const groups = unionFind(itemsWithSource, (a, b) => {
    return jaccardSimilarity(a.title, b.title) >= jaccardThreshold;
  });

  const trendCandidates: TrendCandidate[] = [];

  for (const [, group] of groups) {
    const sources = [...new Set(group.map((i) => i.sourceId))];
    if (sources.length < minSources) continue;

    const canonical = group[0]!;
    const bodies = group.map((i) => i.body.trim()).filter(Boolean);
    const aggregatedBody = bodies
      .slice(0, 5)
      .join("\n\n---\n\n")
      .slice(0, maxBodyLength);
    const itemRefs = group.map((i) => i.url).filter((u): u is string => !!u);

    trendCandidates.push({
      topic: canonical.title,
      aggregatedBody: aggregatedBody || canonical.body.slice(0, 500),
      sources: [...sources].sort(),
      sourceCount: sources.length,
      itemRefs,
    });
  }

  return {
    trendCandidates: trendCandidates.sort((a, b) => b.sourceCount - a.sourceCount),
  };
}
