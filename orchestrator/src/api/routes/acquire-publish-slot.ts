import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import { createPublishedRepo } from "../../repos/published.js";
import { createPublishDedupe } from "../../redis/publish-dedupe.js";
import { createPublishRateLimit } from "../../redis/publish-rate.js";
import { REDIS_TTL, PUBLISH_RATE_LIMITS } from "../../config/constants.js";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";

export async function registerAcquirePublishSlotRoute(
  app: FastifyInstance,
  deps: { db: PrismaClient; redis: Redis }
) {
  const publishedRepo = createPublishedRepo(deps.db);
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

    const job = await deps.db.job.findUnique({
      where: { id: jobId },
      include: { inputs: true, outputs: true },
    });

    if (!job) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "Job not found", { jobId })
      );
    }

    const norm = job.inputs?.normalizedPayload as { channel?: { id?: string; type?: string } } | undefined;
    const channelId = bodyChannelId ?? norm?.channel?.id ?? "default";

    if (job.decision !== "APPROVED") {
      return reply.status(409).send(
        formatErrorResponse(ERROR_CODES.CONFLICT, "Job is not APPROVED", { jobId })
      );
    }

    const draft = job.outputs?.draft ?? "";
    if (!draft) {
      return reply.status(409).send(
        formatErrorResponse(ERROR_CODES.CONFLICT, "No draft content to publish", { jobId })
      );
    }

    const contentHash = publishDedupe.hashContent(draft);

    if (await publishDedupe.isDuplicate(channelId, contentHash)) {
      return reply.status(200).send({
        canPublish: false,
        reason: "duplicate",
        message: "Content already published to this channel recently",
      });
    }

    const chType = channelType ?? norm?.channel?.type ?? "default";
    const { current, limit } = await publishRate.check(channelId, chType);

    if (current >= limit) {
      return reply.status(200).send({
        canPublish: false,
        reason: "rate_limit",
        message: `Channel rate limit exceeded (${current}/${limit} per hour)`,
        current,
        limit,
      });
    }

    const alreadyPublished = await publishedRepo.hasPublishedForJob(jobId);
    if (alreadyPublished) {
      return reply.status(200).send({
        canPublish: false,
        reason: "duplicate",
        message: "Job already published",
      });
    }

    await publishRate.incr(channelId);
    await publishDedupe.markPublished(channelId, contentHash);

    return reply.status(200).send({
      canPublish: true,
      contentHash,
    });
  });
}
