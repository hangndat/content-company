/**
 * Reporting semantics for dashboard responses.
 * Include in every dashboard API response for clarity.
 */
export const SEMANTICS = {
  cohortBy: "job_creation_date",
  reviewScoreScale: "0..1",
  smoothedCtrFormula: "(clicks + 1) / (views + 10)",
  approveRateBase: "jobsCount",
} as const;

export type Semantics = typeof SEMANTICS;
