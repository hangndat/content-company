import type { FastifyInstance } from "fastify";
import type { createJobRepo } from "../../repos/job.js";
import type { createContentMetricRepo } from "../../repos/content-metric.js";
import { extractTopicIdentifiers } from "../../lib/topic-key.js";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";

export async function registerMetricsRecordRoute(
  app: FastifyInstance,
  deps: {
    jobRepo: ReturnType<typeof createJobRepo>;
    contentMetricRepo: ReturnType<typeof createContentMetricRepo>;
  }
) {
  const { jobRepo, contentMetricRepo } = deps;

  app.post<{
    Params: { jobId: string };
    Body: { channelId?: string; impressions?: number; views?: number; clicks?: number };
  }>("/v1/jobs/:jobId/metrics", async (req, reply) => {
    const { jobId } = req.params;
    const { channelId, impressions, views, clicks } = req.body ?? {};

    if (!channelId) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "channelId is required", {})
      );
    }

    const job = await jobRepo.findById(jobId);

    if (!job) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "Job not found", { jobId })
      );
    }

    const ids = job.outputs?.outline
      ? extractTopicIdentifiers(job.outputs.outline)
      : { topicKey: "", topicLabel: "", topicSignature: "" };

    await contentMetricRepo.upsert({
      jobId,
      channelId,
      topicKey: ids.topicKey || undefined,
      topicLabel: ids.topicLabel || undefined,
      topicSignature: ids.topicSignature || undefined,
      impressions,
      views,
      clicks,
    });

    return { jobId, channelId, recorded: true };
  });
}
