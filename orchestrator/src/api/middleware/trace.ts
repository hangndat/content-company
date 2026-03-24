import type { FastifyRequest } from "fastify";
import { randomUUID } from "crypto";

export function getTraceContext(req: FastifyRequest): {
  traceId: string;
  jobId?: string;
  idempotencyKey?: string;
  sourceSystem?: string;
} {
  const traceId = (req.headers["x-trace-id"] as string) || randomUUID();
  const jobId = req.headers["x-job-id"] as string | undefined;
  const idempotencyKey = req.headers["x-idempotency-key"] as string | undefined;
  const sourceSystem = req.headers["x-source-system"] as string | undefined;
  return { traceId, jobId, idempotencyKey, sourceSystem };
}
