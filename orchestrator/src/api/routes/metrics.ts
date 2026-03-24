import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";

export async function registerMetricsRoutes(
  app: FastifyInstance,
  deps: { db: PrismaClient }
) {
  app.get("/v1/metrics", async () => {
    const [byStatus, byDecision] = await Promise.all([
      deps.db.job.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      deps.db.job.groupBy({
        by: ["decision"],
        where: { decision: { not: null } },
        _count: { id: true },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      byStatus.map((r) => [r.status, r._count.id])
    );
    const decisionCounts = Object.fromEntries(
      byDecision.map((r) => [r.decision!, r._count.id])
    );

    return {
      jobs: {
        byStatus: statusCounts,
        byDecision: decisionCounts,
        total: byStatus.reduce((s, r) => s + r._count.id, 0),
      },
    };
  });
}
