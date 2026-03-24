import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { createTrendTopicObservationRepo } from "../../repos/trend-topic-observation.js";
import { articleCountFromCandidate } from "../../lib/trend-candidate-display.js";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";

const listQuerySchema = z.object({
  domain: z.string().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function registerTrendTopicsRoutes(
  app: FastifyInstance,
  deps: { trendTopicObservationRepo: ReturnType<typeof createTrendTopicObservationRepo> }
) {
  const { trendTopicObservationRepo } = deps;

  app.get("/v1/trend-topics/:id", async (req, reply) => {
    const parsed = idParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid id", parsed.error.flatten())
      );
    }
    const { id } = parsed.data;

    const obs = await trendTopicObservationRepo.findByIdWithJobOutputs(id);

    if (!obs) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "Trend topic observation not found")
      );
    }

    const rawCandidates = obs.job.outputs?.trendCandidates;
    const candidates = Array.isArray(rawCandidates) ? rawCandidates : [];
    const candidate = candidates[obs.candidateIndex] ?? null;

    return {
      observation: {
        id: obs.id,
        fingerprint: obs.fingerprint,
        trendDomain: obs.trendDomain,
        sourceJobId: obs.sourceJobId,
        candidateIndex: obs.candidateIndex,
        topicTitle: obs.topicTitle,
        createdAt: obs.createdAt.toISOString(),
      },
      job: {
        id: obs.job.id,
        status: obs.job.status,
        completedAt: obs.job.completedAt?.toISOString() ?? null,
      },
      candidate,
    };
  });

  app.get("/v1/trend-topics", async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid query", parsed.error.flatten())
      );
    }
    const { domain, limit: lim, offset: off } = parsed.data;
    const limit = lim ?? 50;
    const offset = off ?? 0;

    const { rows, total } = await trendTopicObservationRepo.listPaged({
      domain,
      limit,
      offset,
    });

    const items = rows.map((r) => {
      const raw = r.job.outputs?.trendCandidates;
      const candidates = Array.isArray(raw) ? raw : [];
      const c = candidates[r.candidateIndex];
      return {
        id: r.id,
        fingerprint: r.fingerprint,
        trendDomain: r.trendDomain,
        sourceJobId: r.sourceJobId,
        candidateIndex: r.candidateIndex,
        topicTitle: r.topicTitle,
        createdAt: r.createdAt.toISOString(),
        articleCount: articleCountFromCandidate(c),
      };
    });

    return { items, total };
  });
}
