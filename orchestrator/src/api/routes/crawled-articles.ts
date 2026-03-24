import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";

const listQuerySchema = z.object({
  domain: z.string().min(1).max(64).optional(),
  q: z.string().min(1).max(200).optional(),
  processed: z.enum(["all", "yes", "no"]).optional().default("all"),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function registerCrawledArticlesRoutes(
  app: FastifyInstance,
  deps: { db: PrismaClient }
) {
  const { db } = deps;

  app.get("/v1/crawled-articles", async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid query", parsed.error.flatten())
      );
    }
    const { domain, q, processed, limit: lim, offset: off } = parsed.data;
    const limit = lim ?? 50;
    const offset = off ?? 0;

    const where: Prisma.CrawledArticleWhereInput = {};
    if (domain) where.trendDomain = domain;
    if (q?.trim()) {
      const s = q.trim();
      where.OR = [
        { title: { contains: s, mode: "insensitive" } },
        { url: { contains: s, mode: "insensitive" } },
      ];
    }
    if (processed === "yes") where.processedForTrendAt = { not: null };
    if (processed === "no") where.processedForTrendAt = null;

    const [items, total] = await Promise.all([
      db.crawledArticle.findMany({
        where,
        orderBy: { lastSeenAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          dedupeKey: true,
          trendDomain: true,
          url: true,
          title: true,
          bodyPreview: true,
          sourceId: true,
          firstSeenAt: true,
          lastSeenAt: true,
          processedForTrendAt: true,
        },
      }),
      db.crawledArticle.count({ where }),
    ]);

    return {
      items: items.map((r) => ({
        id: r.id,
        dedupeKey: r.dedupeKey,
        trendDomain: r.trendDomain,
        url: r.url,
        title: r.title,
        bodyPreview: r.bodyPreview,
        sourceId: r.sourceId,
        firstSeenAt: r.firstSeenAt.toISOString(),
        lastSeenAt: r.lastSeenAt.toISOString(),
        processedForTrendAt: r.processedForTrendAt?.toISOString() ?? null,
      })),
      total,
    };
  });
}
