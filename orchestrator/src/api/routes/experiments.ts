import type { FastifyInstance } from "fastify";
import type { createExperimentRepo } from "../../repos/experiment.js";
import type { createPromptVersionRepo } from "../../repos/prompt-version.js";
import {
  NODE_TYPES,
  SCOPES,
  EXPERIMENT_STATUS,
} from "../../experiments/constants.js";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";
import { buildExperimentReport } from "../../services/experiment-report.js";
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
  deps: {
    experimentRepo: ReturnType<typeof createExperimentRepo>;
    promptVersionRepo: ReturnType<typeof createPromptVersionRepo>;
  }
) {
  const { experimentRepo: repo, promptVersionRepo } = deps;

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

    const { experiment: exp, createdArms } = await repo.createExperimentWithArms(
      {
        name,
        nodeType,
        scope,
        scopeValue: scopeValue ?? null,
        numBuckets,
      },
      arms
    );

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
    await promptVersionRepo.setActive(exp.nodeType, arm.promptVersion);
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

    const results = await repo.listDailyResultsSince(id, since);
    return buildExperimentReport(id, exp, results);
  });
}
