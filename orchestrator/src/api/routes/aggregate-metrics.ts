import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import { runAggregateMetrics } from "../../jobs/aggregate-metrics.js";
import { runAggregateExperimentMetrics } from "../../jobs/aggregate-experiment-metrics.js";

export async function registerAggregateMetricsRoute(
  app: FastifyInstance,
  deps: { db: PrismaClient; logger: Logger }
) {
  app.post<{ Body?: { days?: number } }>(
    "/v1/admin/aggregate-metrics",
    async (req, reply) => {
      const days = req.body?.days ?? 7;
      const { aggregated } = await runAggregateMetrics(deps.db, deps.logger, {
        days,
      });
      return reply.status(200).send({ aggregated, days });
    }
  );

  app.post<{ Body?: { days?: number; experimentIds?: string[] } }>(
    "/v1/admin/aggregate-experiments",
    async (req, reply) => {
      const days = req.body?.days ?? 7;
      const experimentIds = req.body?.experimentIds;
      const { aggregated } = await runAggregateExperimentMetrics(
        deps.db,
        deps.logger,
        { days, experimentIds }
      );
      return reply.status(200).send({ aggregated, days });
    }
  );
}
