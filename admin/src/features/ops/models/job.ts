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

export interface TrendCandidate {
  topic: string;
  aggregatedBody?: string;
  sources?: string[];
  sourceCount?: number;
  itemRefs?: string[];
  embeddingModel?: string;
  embeddingDimensions?: number;
  topicEmbedding?: number[];
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
  } | null;
  steps: JobStepSnapshot[];
}

export interface JobListItem {
  id: string;
  status: string;
  decision: string | null;
  sourceType: string;
  createdAt: string;
  completedAt: string | null;
  /** Chỉ job trend_aggregate */
  trendCandidateCount?: number;
  trendTopTopic?: string;
}

export interface JobsListResponse {
  items: JobListItem[];
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
