import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { createPublishedRepo } from "../../repos/published.js";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";

const publishedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.string().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function registerPublishedRoutes(
  app: FastifyInstance,
  deps: { publishedRepo: ReturnType<typeof createPublishedRepo> }
) {
  const { publishedRepo } = deps;

  app.get("/v1/published", async (req, reply) => {
    const parsed = publishedQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "Invalid query parameters",
          parsed.error.flatten()
        )
      );
    }

    const { limit, offset, status, from, to } = parsed.data;

    const { items, total } = await publishedRepo.listPagedWithJob({
      limit,
      offset,
      status,
      from,
      to,
    });

    return {
      items: items.map((p) => ({
        id: p.id,
        jobId: p.jobId,
        channelId: p.channelId,
        status: p.status,
        publishRef: p.publishRef,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        job: p.job
          ? {
              id: p.job.id,
              status: p.job.status,
              decision: p.job.decision,
              createdAt: p.job.createdAt.toISOString(),
            }
          : null,
      })),
      total,
    };
  });
}
