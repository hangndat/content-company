import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { createExperimentRepo } from "../../repos/experiment.js";
import {
  NODE_TYPES,
  SCOPES,
  EXPERIMENT_STATUS,
} from "../../experiments/constants.js";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";
import { z } from "zod";

const createBodySchema = z.object({
  name: z.string().min(1),
  nodeType: z.enum(NODE_TYPES),
  scope: z.enum(SCOPES),
  scopeValue: z.string().optional().nullable(),
  numBuckets: z.number().int().min(2).max(1000).optional(),
  arms: z.array(
    z.object({
      name: z.string().min(1),
      promptVersion: z.number().int().positive(),
      bucketStart: z.number().int().min(0),
      bucketEnd: z.number().int().min(0),
    })
  ).min(1),
});

export async function registerExperimentRoutes(
  app: FastifyInstance,
  deps: { db: PrismaClient }
) {
  const repo = createExperimentRepo(deps.db);

  app.post<{ Body: unknown }>("/v1/experiments", async (req, reply) => {
    const parsed = createBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid body", parsed.error.flatten())
      );
    }
    const { name, nodeType, scope, scopeValue, numBuckets = 100, arms } = parsed.data;

    const controlNames = arms.filter((a) => a.name.toLowerCase() === "control");
    if (controlNames.length > 1) {
      return reply.status(400).send(
        formatErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "At most one arm may be named 'control'",
          {}
        )
      );
    }
    const controlArm = arms[0];
    const controlNote =
      controlNames.length === 0
        ? `No arm named "control"; first arm "${controlArm.name}" will be treated as control for winner comparison.`
        : undefined;

    const exp = await repo.create({
      name,
      nodeType,
      scope,
      scopeValue: scopeValue ?? null,
      numBuckets,
    });

    const createdArms: { id: string; name: string }[] = [];
    for (const arm of arms) {
      const createdArm = await deps.db.experimentArm.create({
        data: {
          experimentId: exp.id,
          name: arm.name,
          promptType: nodeType,
          promptVersion: arm.promptVersion,
          bucketStart: arm.bucketStart,
          bucketEnd: arm.bucketEnd,
        },
      });
      createdArms.push({ id: createdArm.id, name: createdArm.name });
    }

    const created = await repo.findById(exp.id);
    const defaultControl = createdArms[0];
    return reply.status(201).send({
      ...created,
      controlArmId: defaultControl?.id ?? null,
      controlArmName: defaultControl?.name ?? controlArm.name,
      _note: controlNote,
    });
  });

  app.get("/v1/experiments", async () => {
    const list = await repo.list();
    return list;
  });

  app.get<{ Params: { id: string } }>("/v1/experiments/:id", async (req, reply) => {
    const { id } = req.params;
    const exp = await repo.findById(id);
    if (!exp) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "Experiment not found", { id })
      );
    }
    return exp;
  });

  app.post<{ Params: { id: string } }>("/v1/experiments/:id/start", async (req, reply) => {
    const { id } = req.params;
    const exp = await repo.findById(id);
    if (!exp) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "Experiment not found", { id })
      );
    }
    if (exp.status !== EXPERIMENT_STATUS.DRAFT && exp.status !== EXPERIMENT_STATUS.PAUSED) {
      return reply.status(409).send(
        formatErrorResponse(ERROR_CODES.CONFLICT, "Experiment must be draft or paused to start", { id })
      );
    }
    await repo.updateStatus(id, EXPERIMENT_STATUS.RUNNING);
    return { id, status: EXPERIMENT_STATUS.RUNNING };
  });

  app.post<{ Params: { id: string } }>("/v1/experiments/:id/pause", async (req, reply) => {
    const { id } = req.params;
    const exp = await repo.findById(id);
    if (!exp) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "Experiment not found", { id })
      );
    }
    if (exp.status !== EXPERIMENT_STATUS.RUNNING) {
      return reply.status(409).send(
        formatErrorResponse(ERROR_CODES.CONFLICT, "Experiment must be running to pause", { id })
      );
    }
    await repo.updateStatus(id, EXPERIMENT_STATUS.PAUSED);
    return { id, status: EXPERIMENT_STATUS.PAUSED };
  });

  app.post<{ Params: { id: string } }>("/v1/experiments/:id/complete", async (req, reply) => {
    const { id } = req.params;
    const exp = await repo.findById(id);
    if (!exp) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "Experiment not found", { id })
      );
    }
    await repo.updateStatus(id, EXPERIMENT_STATUS.COMPLETED);
    return { id, status: EXPERIMENT_STATUS.COMPLETED };
  });

  app.post<{
    Params: { id: string };
    Body: { armId?: string };
  }>("/v1/experiments/:id/promote", async (req, reply) => {
    const { id } = req.params;
    const { armId } = req.body ?? {};
    const exp = await repo.findById(id);
    if (!exp) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "Experiment not found", { id })
      );
    }
    const arm = armId
      ? exp.arms.find((a) => a.id === armId)
      : exp.arms[0];
    if (!arm) {
      return reply.status(400).send(
        formatErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "armId required or invalid; use report to get winner suggestion",
          {}
        )
      );
    }
    await deps.db.promptVersion.updateMany({
      where: { type: exp.nodeType },
      data: { isActive: false },
    });
    await deps.db.promptVersion.update({
      where: { type_version: { type: exp.nodeType, version: arm.promptVersion } },
      data: { isActive: true },
    });
    return { id, promoted: { armId: arm.id, promptVersion: arm.promptVersion } };
  });

  app.get<{
    Params: { id: string };
    Querystring: { days?: number };
  }>("/v1/experiments/:id/report", async (req, reply) => {
    const { id } = req.params;
    const days = Math.min(Math.max(req.query?.days ?? 30, 1), 365);
    const exp = await repo.findById(id);
    if (!exp) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "Experiment not found", { id })
      );
    }

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const results = await deps.db.experimentResultsDaily.findMany({
      where: { experimentId: id, metricDate: { gte: since } },
      include: { arm: true },
      orderBy: { metricDate: "desc" },
    });

    const byArm = new Map<
      string,
      {
        armId: string;
        name: string;
        jobsCount: number;
        approvedCount: number;
        reviewRequiredCount: number;
        rejectedCount: number;
        impressions: number;
        views: number;
        clicks: number;
        sampleCount: number;
        reviewScoreSum: number;
        reviewScoreCount: number;
      }
    >();

    for (const r of results) {
      const existing = byArm.get(r.armId) ?? {
        armId: r.armId,
        name: r.arm.name,
        jobsCount: 0,
        approvedCount: 0,
        reviewRequiredCount: 0,
        rejectedCount: 0,
        impressions: 0,
        views: 0,
        clicks: 0,
        sampleCount: 0,
        reviewScoreSum: 0,
        reviewScoreCount: 0,
      };
      existing.jobsCount += r.jobsCount;
      existing.approvedCount += r.approvedCount;
      existing.reviewRequiredCount += r.reviewRequiredCount;
      existing.rejectedCount += r.rejectedCount;
      existing.impressions += r.impressions;
      existing.views += r.views;
      existing.clicks += r.clicks;
      existing.sampleCount += r.sampleCount;
      if (r.avgReviewScore != null && r.sampleCount > 0) {
        existing.reviewScoreSum += Number(r.avgReviewScore) * r.sampleCount;
        existing.reviewScoreCount += r.sampleCount;
      }
      byArm.set(r.armId, existing);
    }

    const minSample = 10;
    const maxApproveRateDrop = 0.05;
    const maxReviewScoreDrop = 0.03;

    const arms = Array.from(byArm.values()).map((e) => {
      const avgReviewScore =
        e.reviewScoreCount > 0 ? e.reviewScoreSum / e.reviewScoreCount : null;
      const smoothedCtr =
        e.views > 0 || e.clicks > 0 ? (e.clicks + 1) / (e.views + 10) : null;
      const approveRate = e.jobsCount ? e.approvedCount / e.jobsCount : null;
      const expArm = exp.arms.find((a) => a.id === e.armId);
      return {
        armId: e.armId,
        name: e.name,
        promptType: expArm?.promptType ?? null,
        promptVersion: expArm?.promptVersion ?? null,
        jobsCount: e.jobsCount,
        approvedCount: e.approvedCount,
        reviewRequiredCount: e.reviewRequiredCount,
        rejectedCount: e.rejectedCount,
        approveRate,
        impressions: e.impressions,
        views: e.views,
        clicks: e.clicks,
        sampleCount: e.sampleCount,
        avgReviewScore,
        smoothedCtr,
      };
    });

    const control =
      arms.find((a) => a.name.toLowerCase() === "control") ??
      (exp.arms[0] ? arms.find((a) => a.armId === exp.arms[0].id) ?? arms[0] : null) ??
      null;
    const controlApproveRate = control?.approveRate ?? 0;
    const controlReviewScore =
      control?.avgReviewScore != null ? Number(control.avgReviewScore) : 0;

    const armsWithGuards = arms.map((a) => {
      const approveRate = a.jobsCount ? a.approvedCount / a.jobsCount : 0;
      const reviewScore = a.avgReviewScore != null ? Number(a.avgReviewScore) : 0;
      const approveDrop = controlApproveRate - approveRate;
      const reviewDrop = controlReviewScore - reviewScore;
      const guardResults = {
        passesSample: a.sampleCount >= minSample,
        passesApproveRate: approveDrop <= maxApproveRateDrop,
        passesReviewScore: reviewDrop <= maxReviewScoreDrop,
      };
      return { ...a, guardResults };
    });

    const eligible = armsWithGuards.filter((a) => {
      if (a.sampleCount < minSample) return false;
      const approveRate = a.jobsCount ? a.approvedCount / a.jobsCount : 0;
      const reviewScore = a.avgReviewScore != null ? Number(a.avgReviewScore) : 0;
      const approveDrop = controlApproveRate - approveRate;
      const reviewDrop = controlReviewScore - reviewScore;
      return approveDrop <= maxApproveRateDrop && reviewDrop <= maxReviewScoreDrop;
    });

    const winner =
      eligible.length > 0
        ? eligible.reduce((best, cur) =>
            (cur.smoothedCtr ?? 0) > (best.smoothedCtr ?? 0) ? cur : best
          )
        : null;

    return {
      experimentId: id,
      avgReviewScoreScale: "0..1",
      controlArm: control
        ? { armId: control.armId, name: control.name }
        : null,
      arms: armsWithGuards,
      cohortBy: "job_creation_date",
      note: "Metrics grouped by job creation date. Views/clicks may arrive later (recorded date); consider separate performance-by-metric-date report for lagging metrics.",
      winnerSuggestion:
        winner != null
          ? {
              armId: winner.armId,
              name: winner.name,
              metric: "smoothedCtr",
              guards: {
                minSample,
                maxApproveRateDrop,
                maxReviewScoreDrop,
                avgReviewScoreScale: "0..1",
              },
            }
          : null,
      minSampleForWinner: minSample,
    };
  });
}
