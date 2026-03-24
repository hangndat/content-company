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
}

export interface JobsListResponse {
  items: JobListItem[];
}
