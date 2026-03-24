/** GET /v1/dashboard/agent-io — orchestrator/src/dashboard/queries/agent-io.ts */
export interface AgentIoFeedItem {
  snapshotId: string;
  jobId: string;
  recordedAt: string;
  jobStatus: string;
  sourceType: string;
  promptVersion: number | null;
  inputPreview: string;
  outputPreview: string;
  inputDetail: string;
  outputDetail: string;
}

export interface AgentIoFeedResult {
  items: AgentIoFeedItem[];
}
