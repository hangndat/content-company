import type { PrismaClient } from "@prisma/client";
import { EXPERIMENT_STATUS } from "../experiments/constants.js";

export type CreateExperimentInput = {
  name: string;
  nodeType: string;
  scope: string;
  scopeValue?: string | null;
  numBuckets?: number;
};

export type CreateArmInput = {
  experimentId: string;
  name: string;
  promptType: string;
  promptVersion: number;
  bucketStart: number;
  bucketEnd: number;
};

export type CreateExperimentArmBodyInput = {
  name: string;
  promptVersion: number;
  bucketStart: number;
  bucketEnd: number;
};

export function createExperimentRepo(db: PrismaClient) {
  return {
    async create(input: CreateExperimentInput) {
      return db.experiment.create({
        data: {
          name: input.name,
          nodeType: input.nodeType,
          scope: input.scope,
          scopeValue: input.scopeValue ?? null,
          numBuckets: input.numBuckets ?? 100,
          status: EXPERIMENT_STATUS.DRAFT,
        },
      });
    },

    async findById(id: string) {
      return db.experiment.findUnique({
        where: { id },
        include: { arms: { orderBy: { createdAt: "asc" } } },
      });
    },

    async list(opts?: { status?: string; nodeType?: string }) {
      const where: { status?: string; nodeType?: string } = {};
      if (opts?.status) where.status = opts.status;
      if (opts?.nodeType) where.nodeType = opts.nodeType;
      return db.experiment.findMany({
        where,
        include: { arms: true },
        orderBy: { createdAt: "desc" },
      });
    },

    /** Returns matching experiments, most specific first (channel > topic > source_type > global). */
    async findRunningForNode(nodeType: string, context: {
      channelId?: string;
      topicKey?: string;
      sourceType?: string;
    }) {
      const experiments = await db.experiment.findMany({
        where: {
          nodeType,
          status: EXPERIMENT_STATUS.RUNNING,
        },
        include: { arms: true },
      });

      const matches = experiments.filter((exp) => {
        if (exp.scope === "global") return true;
        if (exp.scope === "channel" && exp.scopeValue) {
          return context.channelId === exp.scopeValue;
        }
        if (exp.scope === "topic" && exp.scopeValue) {
          return context.topicKey?.startsWith(exp.scopeValue) ?? false;
        }
        if (exp.scope === "source_type" && exp.scopeValue) {
          return context.sourceType === exp.scopeValue;
        }
        return false;
      });

      const specificity = (s: string) =>
        s === "channel" ? 3 : s === "topic" ? 2 : s === "source_type" ? 1 : 0;
      matches.sort((a, b) => specificity(b.scope) - specificity(a.scope));
      return matches;
    },

    async updateStatus(id: string, status: string) {
      return db.experiment.update({
        where: { id },
        data: { status },
      });
    },

    async createExperimentWithArms(
      input: CreateExperimentInput,
      arms: CreateExperimentArmBodyInput[]
    ) {
      return db.$transaction(async (tx) => {
        const exp = await tx.experiment.create({
          data: {
            name: input.name,
            nodeType: input.nodeType,
            scope: input.scope,
            scopeValue: input.scopeValue ?? null,
            numBuckets: input.numBuckets ?? 100,
            status: EXPERIMENT_STATUS.DRAFT,
          },
        });
        const createdArms: { id: string; name: string }[] = [];
        for (const arm of arms) {
          const row = await tx.experimentArm.create({
            data: {
              experimentId: exp.id,
              name: arm.name,
              promptType: input.nodeType,
              promptVersion: arm.promptVersion,
              bucketStart: arm.bucketStart,
              bucketEnd: arm.bucketEnd,
            },
          });
          createdArms.push({ id: row.id, name: row.name });
        }
        return { experiment: exp, createdArms };
      });
    },

    async listDailyResultsSince(experimentId: string, since: Date) {
      return db.experimentResultsDaily.findMany({
        where: { experimentId, metricDate: { gte: since } },
        include: { arm: true },
        orderBy: { metricDate: "desc" },
      });
    },
  };
}
