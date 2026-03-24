import type { FastifyInstance } from "fastify";
import type { createContentDraftRepo } from "../../repos/content-draft.js";

export async function registerContentDraftRoutes(
  app: FastifyInstance,
  deps: { contentDraftRepo: ReturnType<typeof createContentDraftRepo> }
) {
  const { contentDraftRepo } = deps;

  app.get<{
    Querystring: {
      limit?: number;
      offset?: number;
      status?: string;
      sourceType?: string;
      jobId?: string;
    };
  }>("/v1/content-drafts", async (req) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const status = req.query.status?.trim() || undefined;
    const sourceType = req.query.sourceType?.trim() || undefined;
    const jobId = req.query.jobId?.trim() || undefined;

    const { rows, total } = await contentDraftRepo.listPagedForApi({
      jobId,
      jobStatus: status,
      jobSourceType: sourceType,
      limit,
      offset,
    });

    return {
      total,
      items: rows.map((r) => ({
        id: r.id,
        jobId: r.jobId,
        outlinePreview: r.outline
          ? r.outline.length > 160
            ? `${r.outline.slice(0, 158)}…`
            : r.outline
          : null,
        bodyPreview: r.body
          ? r.body.length > 320
            ? `${r.body.slice(0, 318)}…`
            : r.body
          : null,
        decision: r.decision,
        topicScore: r.topicScore != null ? Number(r.topicScore) : null,
        reviewScore: r.reviewScore != null ? Number(r.reviewScore) : null,
        updatedAt: r.updatedAt,
        job: {
          id: r.job.id,
          status: r.job.status,
          decision: r.job.decision,
          sourceType: r.job.sourceType,
          completedAt: r.job.completedAt,
        },
      })),
    };
  });
}
