import type { FastifyInstance } from "fastify";
import type { Redis } from "ioredis";
import type { createJobRepo } from "../../repos/job.js";
import type { createPublishedRepo } from "../../repos/published.js";
import { createPublishDedupe } from "../../redis/publish-dedupe.js";
import { createPublishRateLimit } from "../../redis/publish-rate.js";
import { REDIS_TTL, PUBLISH_RATE_LIMITS } from "../../config/constants.js";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";
import { evaluateAcquirePublishSlot } from "../../services/acquire-publish-slot.js";

export async function registerAcquirePublishSlotRoute(
  app: FastifyInstance,
  deps: {
    redis: Redis;
    jobRepo: ReturnType<typeof createJobRepo>;
    publishedRepo: ReturnType<typeof createPublishedRepo>;
  }
) {
  const publishDedupe = createPublishDedupe(deps.redis, REDIS_TTL.PUBLISH_DEDUPE);
  const publishRate = createPublishRateLimit(
    deps.redis,
    REDIS_TTL.RATE_LIMIT_BUCKET,
    (channelType) => PUBLISH_RATE_LIMITS[channelType] ?? PUBLISH_RATE_LIMITS.default
  );

  app.post<{
    Params: { jobId: string };
    Body: { channelId?: string; channelType?: string };
  }>("/v1/jobs/:jobId/acquire-publish-slot", async (req, reply) => {
    const { jobId } = req.params;
    const { channelId: bodyChannelId, channelType } = req.body ?? {};

    const outcome = await evaluateAcquirePublishSlot(
      { jobId, bodyChannelId, channelType },
      {
        jobRepo: deps.jobRepo,
        publishedRepo: deps.publishedRepo,
        publishDedupe,
        publishRate,
      }
    );

    switch (outcome.kind) {
      case "not_found":
        return reply.status(404).send(
          formatErrorResponse(ERROR_CODES.NOT_FOUND, "Job not found", { jobId })
        );
      case "not_approved":
        return reply.status(409).send(
          formatErrorResponse(ERROR_CODES.CONFLICT, "Job is not APPROVED", { jobId })
        );
      case "no_draft":
        return reply.status(409).send(
          formatErrorResponse(ERROR_CODES.CONFLICT, "No draft content to publish", { jobId })
        );
      case "duplicate_content":
        return reply.status(200).send({
          canPublish: false,
          reason: "duplicate",
          message: "Content already published to this channel recently",
        });
      case "rate_limit":
        return reply.status(200).send({
          canPublish: false,
          reason: "rate_limit",
          message: `Channel rate limit exceeded (${outcome.current}/${outcome.limit} per hour)`,
          current: outcome.current,
          limit: outcome.limit,
        });
      case "already_published":
        return reply.status(200).send({
          canPublish: false,
          reason: "duplicate",
          message: "Job already published",
        });
      case "ok":
        return reply.status(200).send({
          canPublish: true,
          contentHash: outcome.contentHash,
        });
    }
  });
}
