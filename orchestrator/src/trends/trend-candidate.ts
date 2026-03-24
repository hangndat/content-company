/**
 * Trend aggregate job output — shared by aggregate node, embed-refine, job repo, API.
 */
/** Một bài gốp trong cụm topic (đủ title; url có thể thiếu). */
export type TrendSourceArticle = {
  title: string;
  url?: string;
};

export type TrendCandidate = {
  topic: string;
  aggregatedBody: string;
  sources: string[];
  sourceCount: number;
  itemRefs: string[];
  /** Danh sách bài trong cụm — ưu tiên hiển thị; `itemRefs` giữ để tương thích. */
  sourceArticles?: TrendSourceArticle[];
  /** Set after embed-refine when API succeeds */
  embeddingModel?: string;
  embeddingDimensions?: number;
  /** Preview (first N dims) or full vector; omitted when TREND_EMBEDDING_STORE=off */
  topicEmbedding?: number[];
};
