import type { FastifyInstance } from "fastify";
import type { Redis } from "ioredis";
import type { PrismaClient } from "@prisma/client";

export async function registerHealthRoutes(
  app: FastifyInstance,
  deps: { redis: Redis; db: PrismaClient }
) {
  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/ready", async (req, reply) => {
    try {
      await deps.redis.ping();
      await deps.db.$queryRaw`SELECT 1`;
      return { ready: true };
    } catch (err) {
      req.log.error({ err }, "Readiness check failed");
      return reply.status(503).send({ ready: false, error: "Service unavailable" });
    }
  });
}
