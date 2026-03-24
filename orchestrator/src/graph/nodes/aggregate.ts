import type { GraphState, NormalizedItem } from "../types.js";
import { jaccardSimilarity } from "../../lib/jaccard.js";
import { cosineSim, embedTrendTopicTexts } from "../../lib/trend-embeddings.js";
import { getTrendDomainProfile, resolveTrendSourceId } from "../../trends/domain-profiles.js";
import type { TrendCandidate } from "../../trends/trend-candidate.js";
import type { Env } from "../../config/env.js";

export type { TrendCandidate };

type ItemWithSource = NormalizedItem & { sourceId: string };

/** Union-find theo chỉ số — O(n²) so khớp cặp. */
export function clusterItemsBySimilarity(
  items: ItemWithSource[],
  shouldMerge: (i: number, j: number) => boolean
): ItemWithSource[][] {
  const n = items.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x: number): number {
    const p = parent[x]!;
    if (p !== x) parent[x] = find(p);
    return parent[x]!;
  }
  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (shouldMerge(i, j)) union(i, j);
    }
  }
  const rootToIndices = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    const list = rootToIndices.get(r) ?? [];
    list.push(i);
    rootToIndices.set(r, list);
  }
  return [...rootToIndices.values()].map((indices) => indices.map((idx) => items[idx]!));
}

export function groupsToTrendCandidates(
  groups: ItemWithSource[][],
  minSources: number,
  maxBodyLength: number
): TrendCandidate[] {
  const trendCandidates: TrendCandidate[] = [];
  for (const group of groups) {
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
  return trendCandidates;
}

export type AggregateTrendOptions = {
  /** Ghi đè minSources từ domain profile (từ env TREND_MIN_SOURCES). */
  minSources?: number;
};

export function aggregate(
  state: GraphState,
  options?: AggregateTrendOptions
): { trendCandidates: TrendCandidate[] } {
  const items = state.normalizedItems;
  if (items.length === 0) {
    return { trendCandidates: [] };
  }

  const profile = getTrendDomainProfile(state.trendDomain);
  const { jaccardThreshold, maxBodyLength } = profile;
  const minSources = options?.minSources ?? profile.minSources;

  const itemsWithSource: ItemWithSource[] = items.map((i) => ({
    ...i,
    sourceId: resolveTrendSourceId(state.trendDomain, i.url, i.sourceId),
  }));

  const groups = clusterItemsBySimilarity(itemsWithSource, (i, j) => {
    return (
      jaccardSimilarity(itemsWithSource[i]!.title, itemsWithSource[j]!.title) >= jaccardThreshold
    );
  });

  const trendCandidates = groupsToTrendCandidates(groups, minSources, maxBodyLength);
  return {
    trendCandidates: trendCandidates.sort((a, b) => b.sourceCount - a.sourceCount),
  };
}

type AggregateTrendsAsyncDeps = {
  env: Env;
  logger: import("pino").Logger;
};

/**
 * Gom tin: Jaccard title HOẶC cosine embedding title (cùng sự kiện, khác cách viết).
 * Tắt: TREND_ITEM_SEMANTIC_CLUSTER=0 — chỉ Jaccard như cũ.
 */
export async function aggregateTrendsAsync(
  state: GraphState,
  deps: AggregateTrendsAsyncDeps
): Promise<{ trendCandidates: TrendCandidate[] }> {
  const { env, logger } = deps;
  const minSources = env.TREND_MIN_SOURCES;

  if (!env.TREND_ITEM_SEMANTIC_CLUSTER) {
    return aggregate(state, { minSources });
  }

  const items = state.normalizedItems;
  if (items.length === 0) {
    return { trendCandidates: [] };
  }

  const profile = getTrendDomainProfile(state.trendDomain);
  const itemsWithSource: ItemWithSource[] = items.map((i) => ({
    ...i,
    sourceId: resolveTrendSourceId(state.trendDomain, i.url, i.sourceId),
  }));

  const titles = itemsWithSource.map((i) => i.title);
  const embeddings = await embedTrendTopicTexts(
    env.OPENAI_API_KEY,
    env.TREND_EMBEDDING_MODEL,
    titles,
    {
      env,
      jobId: state.jobId,
      traceId: state.traceId,
      step: "trend_item_embedding",
      logger,
    }
  );

  if (!embeddings) {
    logger.warn(
      { jobId: state.jobId },
      "Trend aggregate: item embeddings failed, falling back to Jaccard-only"
    );
    return aggregate(state, { minSources });
  }

  const jT = profile.jaccardThreshold;
  const cT = env.TREND_ITEM_COSINE_THRESHOLD;

  const groups = clusterItemsBySimilarity(itemsWithSource, (i, j) => {
    if (jaccardSimilarity(itemsWithSource[i]!.title, itemsWithSource[j]!.title) >= jT) {
      return true;
    }
    const a = embeddings[i];
    const b = embeddings[j];
    return !!(a && b && cosineSim(a, b) >= cT);
  });

  const trendCandidates = groupsToTrendCandidates(
    groups,
    minSources,
    profile.maxBodyLength
  );
  return {
    trendCandidates: trendCandidates.sort((a, b) => b.sourceCount - a.sourceCount),
  };
}
