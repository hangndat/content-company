export interface ContentDraftListItem {
  id: string;
  jobId: string;
  outlinePreview: string | null;
  bodyPreview: string | null;
  decision: string | null;
  topicScore: number | null;
  reviewScore: number | null;
  updatedAt: string;
  job: {
    id: string;
    status: string;
    decision: string | null;
    sourceType: string;
    completedAt: string | null;
  };
}

export interface ContentDraftsListResponse {
  items: ContentDraftListItem[];
  total: number;
}
