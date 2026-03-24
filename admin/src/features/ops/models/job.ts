/**
 * Job types — for pipeline steps and job detail.
 */

export interface RawItem {
  id?: string;
  title?: string;
  body?: string;
  url?: string;
  publishedAt?: string;
  sourceId?: string;
}

export interface TrendSourceArticle {
  title: string;
  url?: string;
}

export interface TrendCandidate {
  topic: string;
  aggregatedBody?: string;
  sources?: string[];
  sourceCount?: number;
  itemRefs?: string[];
  sourceArticles?: TrendSourceArticle[];
  embeddingModel?: string;
  embeddingDimensions?: number;
  topicEmbedding?: number[];
  /** Cross-job dedup: đã thấy fingerprint topic ở job trend khác trước đó */
  seenBefore?: boolean;
}

export interface JobStepSnapshot {
  id: string;
  step: string;
  createdAt: string;
  stateJson: {
    normalizedItems?: Array<{ id: string; title: string; body: string; url?: string }>;
    outline?: string;
    topicScore?: number;
    draft?: string;
    reviewScore?: number;
    reviewNotes?: string;
    decision?: string;
    rawItems?: RawItem[];
    [key: string]: unknown;
  };
}

export interface JobInputNormalizedSummary {
  domain?: string;
  channel?: { id?: string; type?: string };
  rawItemsCount?: number;
}

export interface JobApprovalRow {
  id: string;
  action: string;
  actor: string;
  reason: string | null;
  createdAt: string;
}

/** Bản ghi `content_draft` — output chuẩn hoá sau content pipeline (đồng bộ với JobOutput). */
export interface JobContentDraftPayload {
  id: string;
  outline: string | null;
  body: string | null;
  reviewNotes: string | null;
  decision: string | null;
  scores: { topicScore: number | null; reviewScore: number | null };
  createdAt: string;
  updatedAt: string;
}

export interface JobDetailResponse {
  job: {
    jobId: string;
    traceId: string;
    status: string;
    decision: string | null;
    scores: { topicScore: number | null; reviewScore: number | null };
    retryCount: number;
    sourceType: string;
    createdAt: string;
    completedAt: string | null;
    output?: {
      outline: string | null;
      draft: string | null;
      reviewNotes: string | null;
      trendCandidates?: TrendCandidate[];
    };
  };
  input: {
    rawPayload: { rawItems?: RawItem[] };
    normalizedSummary?: JobInputNormalizedSummary;
  } | null;
  approvals: JobApprovalRow[];
  steps: JobStepSnapshot[];
  contentDraft: JobContentDraftPayload | null;
}

export interface JobListItem {
  id: string;
  traceId: string;
  status: string;
  decision: string | null;
  sourceType: string;
  createdAt: string;
  completedAt: string | null;
  retryCount: number;
  topicScore: number | null;
  reviewScore: number | null;
  /** Chỉ job trend_aggregate */
  trendCandidateCount?: number;
  trendTopTopic?: string;
}

export interface JobsListResponse {
  items: JobListItem[];
  total: number;
}

export interface RunJobApiResponse {
  jobId: string;
  traceId: string;
  status: string;
  decision?: string;
  createdAt: string;
  completedAt?: string;
}

/** GET /v1/jobs/:jobId */
export interface JobSummaryResponse {
  jobId: string;
  traceId: string;
  status: string;
  decision: string | null;
  scores: { topicScore: number | null; reviewScore: number | null };
  retryCount: number;
  sourceType: string;
  createdAt: string;
  completedAt: string | null;
  output?: {
    outline: string | null;
    draft: string | null;
    reviewNotes: string | null;
    trendCandidates?: unknown;
  };
}

export interface JobReplayResponse {
  jobId: string;
  traceId: string;
  status: string;
  createdAt: string;
}

export interface ApproveJobResponse {
  jobId: string;
  status: string;
  nextAction: string;
}

export interface RejectJobResponse {
  jobId: string;
  status: string;
}

export interface PublishedListResponse {
  items: unknown[];
  total: number;
}
