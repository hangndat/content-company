import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { createPublishedRepo } from "../../repos/published.js";

export async function registerPublishCallbackRoute(
  app: FastifyInstance,
  deps: { db: PrismaClient }
) {
  const publishedRepo = createPublishedRepo(deps.db);

  app.post<{
    Params: { jobId: string };
    Body: { channelId?: string; publishRef?: string; status?: string };
  }>("/v1/jobs/:jobId/publish-callback", async (req, reply) => {
    const { jobId } = req.params;
    const { channelId, publishRef, status } = req.body ?? {};

    if (!channelId || !status) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "channelId and status are required",
          details: {},
        },
      });
    }

    const record = await publishedRepo.create({
      jobId,
      channelId,
      status,
      publishRef,
      publishedAt: status === "published" ? new Date() : undefined,
    });

    return { id: record.id, status: record.status };
  });
}
