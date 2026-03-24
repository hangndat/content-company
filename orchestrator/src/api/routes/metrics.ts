import type { FastifyInstance } from "fastify";
import type { createJobRepo } from "../../repos/job.js";

export async function registerMetricsRoutes(
  app: FastifyInstance,
  deps: { jobRepo: ReturnType<typeof createJobRepo> }
) {
  app.get("/v1/metrics", async () => {
    return deps.jobRepo.summarizeMetrics();
  });
}
