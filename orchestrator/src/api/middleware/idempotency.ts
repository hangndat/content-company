import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Idempotency is handled at the job service level for POST /v1/jobs/content/run.
 * This middleware can be used to enforce presence of x-idempotency-key for specific routes if needed.
 */
export function idempotencyMiddleware(
  req: FastifyRequest<{ Body?: { idempotencyKey?: string } }>,
  _reply: FastifyReply,
  done: () => void
) {
  const key = req.headers["x-idempotency-key"] as string | undefined;
  (req as FastifyRequest & { idempotencyKey?: string }).idempotencyKey = key;
  done();
}
