import type { FastifyInstance } from "fastify";
import { approveBodySchema, rejectBodySchema } from "../schemas.js";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";
import type { JobService } from "../../services/job.js";

export async function registerApprovalRoutes(
  app: FastifyInstance,
  deps: { jobService: JobService }
) {
  const { jobService } = deps;

  app.post<{
    Params: { jobId: string };
    Body: unknown;
  }>("/v1/jobs/:jobId/approve", async (req, reply) => {
    const { jobId } = req.params;
    const parsed = approveBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid request body", parsed.error.flatten())
      );
    }

    const result = await jobService.approveJob(jobId, parsed.data);
    if (!result) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "Job not found", { jobId })
      );
    }

    return { jobId: result.jobId, status: "approved", nextAction: "publish" };
  });

  app.post<{
    Params: { jobId: string };
    Body: unknown;
  }>("/v1/jobs/:jobId/reject", async (req, reply) => {
    const { jobId } = req.params;
    const parsed = rejectBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid request body", parsed.error.flatten())
      );
    }

    const result = await jobService.rejectJob(jobId, parsed.data);
    if (!result) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "Job not found", { jobId })
      );
    }

    return { jobId: result.jobId, status: "rejected" };
  });
}
