import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { z } from "zod";
import type {
  createTrendContentSourceRepo,
  TrendContentSourceRow,
} from "../../repos/trend-content-source.js";
import type { JobService } from "../../services/job.js";
import { getTraceContext } from "../middleware/trace.js";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";
import { channelSchema, runTrendJobBodySchema } from "../schemas.js";
import { fetchRssAsRawItems } from "../../lib/rss-to-raw-items.js";
import { resolveTrendSourceId } from "../../trends/domain-profiles.js";

const listQuerySchema = z.object({
  domain: z.string().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const createBodySchema = z.object({
  trendDomain: z.string().min(1).max(64),
  kind: z.enum(["rss"]).optional().default("rss"),
  label: z.string().max(255).optional().nullable(),
  feedUrl: z.string().url().max(2048),
  enabled: z.boolean().optional(),
});

const patchBodySchema = createBodySchema.partial();

const previewBodySchema = z.object({
  itemLimit: z.number().int().min(1).max(100).optional(),
});

const runTrendBodySchema = z.object({
  itemLimit: z.number().int().min(1).max(100).optional(),
  skipArticleDedup: z.boolean().optional(),
  channel: channelSchema.optional(),
});

export async function registerTrendContentSourceRoutes(
  app: FastifyInstance,
  deps: {
    trendContentSourceRepo: ReturnType<typeof createTrendContentSourceRepo>;
    jobService: JobService;
  }
) {
  const { trendContentSourceRepo, jobService } = deps;

  app.get("/v1/trend-sources", async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid query", parsed.error.flatten())
      );
    }
    const { domain, limit: lim, offset: off } = parsed.data;
    const limit = lim ?? 50;
    const offset = off ?? 0;
    const { rows, total } = await trendContentSourceRepo.listPaged({ domain, limit, offset });
    return {
      items: rows.map((r: TrendContentSourceRow) => ({
        id: r.id,
        trendDomain: r.trendDomain,
        kind: r.kind,
        label: r.label,
        feedUrl: r.feedUrl,
        enabled: r.enabled,
        lastFetchedAt: r.lastFetchedAt?.toISOString() ?? null,
        lastItemCount: r.lastItemCount,
        lastError: r.lastError,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
    };
  });

  app.post("/v1/trend-sources", async (req, reply) => {
    const parsed = createBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid body", parsed.error.flatten())
      );
    }
    const row = await trendContentSourceRepo.create(parsed.data);
    return reply.status(201).send({
      id: row.id,
      trendDomain: row.trendDomain,
      kind: row.kind,
      label: row.label,
      feedUrl: row.feedUrl,
      enabled: row.enabled,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  });

  app.patch<{ Params: { id: string }; Body: unknown }>("/v1/trend-sources/:id", async (req, reply) => {
    const id = req.params.id;
    const parsed = patchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid body", parsed.error.flatten())
      );
    }
    const patch = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined)
    ) as import("../../repos/trend-content-source.js").TrendContentSourceUpdateInput;
    if (Object.keys(patch).length === 0) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "No fields to update")
      );
    }
    try {
      const row = await trendContentSourceRepo.update(id, patch);
      return {
        id: row.id,
        trendDomain: row.trendDomain,
        kind: row.kind,
        label: row.label,
        feedUrl: row.feedUrl,
        enabled: row.enabled,
        lastFetchedAt: row.lastFetchedAt?.toISOString() ?? null,
        lastItemCount: row.lastItemCount,
        lastError: row.lastError,
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch {
      return reply.status(404).send(formatErrorResponse(ERROR_CODES.NOT_FOUND, "Source not found"));
    }
  });

  app.delete<{ Params: { id: string } }>("/v1/trend-sources/:id", async (req, reply) => {
    try {
      await trendContentSourceRepo.delete(req.params.id);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send(formatErrorResponse(ERROR_CODES.NOT_FOUND, "Source not found"));
    }
  });

  app.post<{ Params: { id: string }; Body: unknown }>(
    "/v1/trend-sources/:id/preview",
    async (req, reply) => {
      const parsedBody = previewBodySchema.safeParse(req.body ?? {});
      if (!parsedBody.success) {
        return reply.status(400).send(
          formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid body", parsedBody.error.flatten())
        );
      }
      const row = await trendContentSourceRepo.findById(req.params.id);
      if (!row) {
        return reply.status(404).send(formatErrorResponse(ERROR_CODES.NOT_FOUND, "Source not found"));
      }
      if (!row.enabled) {
        return reply.status(409).send(
          formatErrorResponse(ERROR_CODES.CONFLICT, "Source is disabled")
        );
      }
      try {
        const { items, skippedShortBody, skippedNoUrl } = await fetchRssAsRawItems(row.feedUrl, {
          limit: parsedBody.data.itemLimit,
        });
        const domain = row.trendDomain;
        let unresolved = 0;
        const resolved = items.map((it) => {
          const sid = resolveTrendSourceId(domain, it.url, undefined);
          if (sid === "unknown") unresolved += 1;
          return { ...it, resolvedSourceId: sid };
        });
        const trendParse = runTrendJobBodySchema.safeParse({
          domain,
          rawItems: items,
          channel: { id: "blog-1", type: "blog", metadata: {} },
        });
        return {
          feedUrl: row.feedUrl,
          trendDomain: domain,
          itemCount: items.length,
          skippedShortBody,
          skippedNoUrl,
          unresolvedSourceCount: unresolved,
          trendJobValidationOk: trendParse.success,
          trendJobValidationError: trendParse.success ? null : trendParse.error.flatten(),
          items: resolved.slice(0, 20),
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return reply.status(502).send(
          formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, `RSS fetch failed: ${msg}`)
        );
      }
    }
  );

  app.post<{ Params: { id: string }; Body: unknown }>(
    "/v1/trend-sources/:id/run-trend",
    async (req, reply) => {
      const ctx = getTraceContext(req);
      const parsedBody = runTrendBodySchema.safeParse(req.body ?? {});
      if (!parsedBody.success) {
        return reply.status(400).send(
          formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid body", parsedBody.error.flatten())
        );
      }
      const row = await trendContentSourceRepo.findById(req.params.id);
      if (!row) {
        return reply.status(404).send(formatErrorResponse(ERROR_CODES.NOT_FOUND, "Source not found"));
      }
      if (!row.enabled) {
        return reply.status(409).send(
          formatErrorResponse(ERROR_CODES.CONFLICT, "Source is disabled")
        );
      }

      let items: Awaited<ReturnType<typeof fetchRssAsRawItems>>["items"];
      try {
        const fetched = await fetchRssAsRawItems(row.feedUrl, {
          limit: parsedBody.data.itemLimit,
        });
        items = fetched.items;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await trendContentSourceRepo.update(row.id, {
          lastError: msg,
        });
        return reply.status(502).send(
          formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, `RSS fetch failed: ${msg}`)
        );
      }

      if (items.length === 0) {
        await trendContentSourceRepo.update(row.id, {
          lastFetchedAt: new Date(),
          lastItemCount: 0,
          lastError: "No RSS items passed filters (body length / URL).",
        });
        return reply.status(400).send(
          formatErrorResponse(
            ERROR_CODES.VALIDATION_ERROR,
            "No usable items from feed after filters"
          )
        );
      }

      const jobId = (req.headers["x-job-id"] as string) || randomUUID();
      const traceId = ctx.traceId;
      const idempotencyKey = ctx.idempotencyKey;

      try {
        const result = await jobService.runTrendJob({
          jobId,
          traceId,
          idempotencyKey,
          domain: row.trendDomain,
          rawItems: items,
          channel: parsedBody.data.channel ?? { id: "blog-1", type: "blog", metadata: {} },
          skipArticleDedup: parsedBody.data.skipArticleDedup,
          trendContentSourceId: row.id,
        });

        await trendContentSourceRepo.update(row.id, {
          lastFetchedAt: new Date(),
          lastItemCount: items.length,
          lastError: null,
        });

        const statusCode = result.duplicate ? 201 : 200;
        return reply.status(statusCode).send({
          jobId: result.jobId,
          traceId: result.traceId,
          status: result.status,
          createdAt: result.createdAt.toISOString(),
          completedAt: result.completedAt?.toISOString() ?? null,
          duplicate: result.duplicate,
          itemCount: items.length,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await trendContentSourceRepo.update(row.id, {
          lastError: msg.slice(0, 2000),
        });
        throw e;
      }
    }
  );
}
