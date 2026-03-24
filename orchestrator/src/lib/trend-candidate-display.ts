/** Derive display article count from a trend candidate JSON blob (list/detail API). */
export function articleCountFromCandidate(c: unknown): number {
  if (!c || typeof c !== "object") return 0;
  const o = c as {
    sourceArticles?: unknown[];
    itemRefs?: unknown[];
    sourceCount?: unknown;
  };
  if (Array.isArray(o.sourceArticles) && o.sourceArticles.length > 0) {
    return o.sourceArticles.length;
  }
  if (Array.isArray(o.itemRefs) && o.itemRefs.length > 0) {
    return o.itemRefs.length;
  }
  if (typeof o.sourceCount === "number") return o.sourceCount;
  return 0;
}
