/**
 * Trend aggregate job output — shared by aggregate node, embed-refine, job repo, API.
 */
export type TrendCandidate = {
  topic: string;
  aggregatedBody: string;
  sources: string[];
  sourceCount: number;
  itemRefs: string[];
  /** Set after embed-refine when API succeeds */
  embeddingModel?: string;
  embeddingDimensions?: number;
  /** Preview (first N dims) or full vector; omitted when TREND_EMBEDDING_STORE=off */
  topicEmbedding?: number[];
};
