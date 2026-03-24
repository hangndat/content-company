import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
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
  deps: { db: PrismaClient }
) {
  const { db } = deps;

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

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (from || to) {
      where.createdAt = {};
      if (from) {
        (where.createdAt as Record<string, Date>).gte = new Date(from);
        (where.createdAt as Record<string, Date>).gte.setHours(0, 0, 0, 0);
      }
      if (to) {
        (where.createdAt as Record<string, Date>).lte = new Date(to);
        (where.createdAt as Record<string, Date>).lte.setHours(23, 59, 59, 999);
      }
    }

    const [items, total] = await Promise.all([
      db.publishedContent.findMany({
        where,
        include: {
          job: {
            select: { id: true, status: true, decision: true, createdAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.publishedContent.count({ where }),
    ]);

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
