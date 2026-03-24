import type { GraphState, NormalizedItem } from "../types.js";

export function normalize(state: GraphState): Partial<GraphState> {
  const items = (state.rawItems ?? [])
    .filter((i) => i.title?.trim() && i.body?.trim())
    .filter((i, idx, arr) => {
      const key = `${i.title}|${i.url ?? ""}`;
      return arr.findIndex((x) => `${x.title}|${x.url ?? ""}` === key) === idx;
    })
    .filter((i) => i.body.length >= 50)
    .map((i, idx): NormalizedItem => ({
      id: i.id ?? `item-${idx}`,
      title: i.title.trim(),
      body: i.body.trim(),
      url: i.url,
      publishedAt: i.publishedAt,
      sourceId: i.sourceId?.trim() || undefined,
    }));

  if (items.length === 0) {
    return { normalizedItems: [], decision: "REJECTED" };
  }

  return { normalizedItems: items };
}
