import type { GraphState } from "../types.js";
import type { TrendCandidate, TrendSourceArticle } from "../../trends/trend-candidate.js";
import type { Env } from "../../config/env.js";
import { getTrendDomainProfile } from "../../trends/domain-profiles.js";
import {
  averageNormalizedEmbeddings,
  cosineSim,
  embedTrendTopicTexts,
  l2Normalize,
} from "../../lib/trend-embeddings.js";

export const EMBEDDING_PREVIEW_DIMS = 32;

export type EmbedRefineOpts = {
  mergeThreshold: number;
  maxBodyLength: number;
  embeddingModel: string;
  store: "off" | "preview" | "full";
};

function clusterIndices(n: number, shouldMerge: (i: number, j: number) => boolean): number[][] {
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
  const buckets = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    const list = buckets.get(r) ?? [];
    list.push(i);
    buckets.set(r, list);
  }
  return [...buckets.values()];
}

function mergeSourceArticlesFromCandidates(group: TrendCandidate[]): TrendSourceArticle[] {
  const seen = new Set<string>();
  const out: TrendSourceArticle[] = [];
  for (const c of group) {
    const list =
      c.sourceArticles && c.sourceArticles.length > 0
        ? c.sourceArticles
        : (c.itemRefs ?? []).map((url) => ({ title: url, url }));
    for (const m of list) {
      const key = m.url?.trim()
        ? m.url.trim().toLowerCase()
        : `t:${m.title.trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(m.url ? { title: m.title, url: m.url } : { title: m.title });
    }
  }
  return out;
}

function mergeCandidateGroup(
  indices: number[],
  candidates: TrendCandidate[],
  embeddings: number[][],
  opts: EmbedRefineOpts
): TrendCandidate {
  const group = indices.map((i) => candidates[i]!);
  const vecs = indices.map((i) => embeddings[i]!);
  const pooled = averageNormalizedEmbeddings(vecs);
  const dims = pooled.length;

  let best = group[0]!;
  for (const c of group) {
    if (c.sourceCount > best.sourceCount) best = c;
    else if (c.sourceCount === best.sourceCount && c.topic.localeCompare(best.topic) < 0) best = c;
  }

  const sources = [...new Set(group.flatMap((c) => c.sources))].sort();
  const itemRefs = [...new Set(group.flatMap((c) => c.itemRefs))];
  const sourceArticles = mergeSourceArticlesFromCandidates(group);

  const bodies = group.map((c) => c.aggregatedBody.trim()).filter(Boolean);
  const aggregatedBody = bodies
    .slice(0, 5)
    .join("\n\n---\n\n")
    .slice(0, opts.maxBodyLength);

  const base: TrendCandidate = {
    topic: best.topic,
    aggregatedBody:
      aggregatedBody || best.aggregatedBody.slice(0, opts.maxBodyLength),
    sources,
    sourceCount: sources.length,
    itemRefs,
    sourceArticles,
    embeddingModel: opts.embeddingModel,
    embeddingDimensions: dims,
  };

  if (opts.store === "off") return base;
  if (opts.store === "preview") {
    const prev = pooled.slice(0, EMBEDDING_PREVIEW_DIMS);
    while (prev.length < EMBEDDING_PREVIEW_DIMS) prev.push(0);
    return { ...base, topicEmbedding: prev };
  }
  return { ...base, topicEmbedding: pooled };
}

/** Pure refine step — for tests and after successful embed API. */
export function refineTrendCandidatesWithEmbeddings(
  candidates: TrendCandidate[],
  embeddings: number[][],
  opts: EmbedRefineOpts
): TrendCandidate[] {
  const n = candidates.length;
  if (n === 0) return [];
  if (n !== embeddings.length) return candidates;

  const unitEmb = embeddings.map((v) => l2Normalize(v));
  const groups = clusterIndices(n, (i, j) => {
    return cosineSim(unitEmb[i]!, unitEmb[j]!) >= opts.mergeThreshold;
  });

  const merged = groups.map((indices) =>
    mergeCandidateGroup(indices, candidates, embeddings, opts)
  );
  return merged.sort((a, b) => b.sourceCount - a.sourceCount);
}

type EmbedRefineDeps = {
  logger: import("pino").Logger;
  env: Env;
};

export async function embedRefineTrends(
  state: GraphState & { trendCandidates?: TrendCandidate[] },
  deps: EmbedRefineDeps
): Promise<{ trendCandidates: TrendCandidate[] } | Record<string, never>> {
  if (!deps.env.TREND_EMBEDDING_REFINE) {
    return {};
  }

  const candidates = state.trendCandidates ?? [];
  if (candidates.length === 0) {
    return {};
  }

  const texts = candidates.map((c) => c.topic);
  const embeddings = await embedTrendTopicTexts(
    deps.env.OPENAI_API_KEY,
    deps.env.TREND_EMBEDDING_MODEL,
    texts,
    {
      env: deps.env,
      jobId: state.jobId,
      traceId: state.traceId,
      step: "trend_refine_embedding",
      logger: deps.logger,
    }
  );

  if (!embeddings) {
    deps.logger.warn(
      { jobId: state.jobId },
      "Trend embed-refine: embedding API failed, pass-through aggregate output"
    );
    return {};
  }

  const profile = getTrendDomainProfile(state.trendDomain);
  const refined = refineTrendCandidatesWithEmbeddings(candidates, embeddings, {
    mergeThreshold: deps.env.TREND_EMBEDDING_MERGE_THRESHOLD,
    maxBodyLength: profile.maxBodyLength,
    embeddingModel: deps.env.TREND_EMBEDDING_MODEL,
    store: deps.env.TREND_EMBEDDING_STORE,
  });

  return { trendCandidates: refined };
}
