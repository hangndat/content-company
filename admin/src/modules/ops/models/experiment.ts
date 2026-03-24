/**
 * Experiment types — verify against orchestrator/src/dashboard/experiments-overview.ts
 * and orchestrator/src/api/routes/experiments.ts report handler.
 */

export type ExperimentStatus = "draft" | "running" | "paused" | "completed";

// orchestrator/src/dashboard/experiments-overview.ts ExperimentOverviewItem
export interface ExperimentListItem {
  id: string;
  name: string;
  nodeType: string;
  scope: string;
  scopeValue: string | null;
  status: ExperimentStatus;
  armsCount: number;
  startedAt: string;
  winnerSuggestion?: {
    armId: string;
    name: string;
    guards?: { minSample: number; maxApproveRateDrop: number; maxReviewScoreDrop: number };
  } | null;
  sampleSufficient: boolean;
}

export interface ExperimentsOverviewResult {
  items: ExperimentListItem[];
  semantics?: {
    cohortBy?: string;
    reviewScoreScale?: string;
    smoothedCtrFormula?: string;
    approveRateBase?: string;
  };
}

export interface ExperimentArmReport {
  armId: string;
  name: string;
  promptType: string | null;
  promptVersion: number | null;
  jobsCount: number;
  approvedCount: number;
  reviewRequiredCount: number;
  rejectedCount: number;
  approveRate: number | null;
  impressions: number;
  views: number;
  clicks: number;
  sampleCount: number;
  avgReviewScore: number | null;
  smoothedCtr: number | null;
  guardResults: {
    passesSample: boolean;
    passesApproveRate: boolean;
    passesReviewScore: boolean;
  };
}

export interface WinnerSuggestion {
  armId: string;
  name: string;
  metric: string;
  guards: {
    minSample: number;
    maxApproveRateDrop: number;
    maxReviewScoreDrop: number;
    avgReviewScoreScale?: string;
  };
}

// orchestrator/src/api/routes/experiments.ts GET /report
export interface ExperimentReport {
  experimentId: string;
  controlArm: { armId: string; name: string } | null;
  arms: ExperimentArmReport[];
  cohortBy: string;
  note: string;
  winnerSuggestion: WinnerSuggestion | null;
  minSampleForWinner: number;
  avgReviewScoreScale?: string;
}
