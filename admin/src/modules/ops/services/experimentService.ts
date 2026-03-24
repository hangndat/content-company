import { api } from "../../../api";
import type { ExperimentReport } from "../models/experiment";

export interface ExperimentMeta {
  id: string;
  name: string;
  nodeType: string;
  scope: string;
  scopeValue: string | null;
  status: string;
  createdAt: string;
  arms: { id: string; name: string }[];
}

export const experimentService = {
  getExperiment: (id: string) =>
    api.experiment(id).then((r) => r as ExperimentMeta),

  getExperimentReport: (id: string, days?: number) =>
    api.experimentReport(id, days).then((r) => r as ExperimentReport),

  startExperiment: (id: string) =>
    api.startExperiment(id),

  pauseExperiment: (id: string) =>
    api.pauseExperiment(id),

  completeExperiment: (id: string) =>
    api.completeExperiment(id),

  promoteExperiment: (id: string, body?: { armId?: string }) =>
    api.promoteExperiment(id, body),
};
