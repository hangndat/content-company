import { api } from "@/lib/api";

export const experimentService = {
  getExperiment: (id: string) => api.experiment(id),

  getExperimentReport: (id: string, days?: number) => api.experimentReport(id, days),

  startExperiment: (id: string) => api.startExperiment(id),

  pauseExperiment: (id: string) => api.pauseExperiment(id),

  completeExperiment: (id: string) => api.completeExperiment(id),

  promoteExperiment: (id: string, body?: { armId?: string }) => api.promoteExperiment(id, body),
};

export type { ExperimentMeta } from "@/features/ops/models/experiment";
