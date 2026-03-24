import type { FastifyInstance } from "fastify";

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL: "INTERNAL",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;

export function formatErrorResponse(code: string, message: string, details?: unknown) {
  return {
    error: {
      code,
      message,
      details: details ?? {},
    },
  };
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, "Request error");
    const code = (err as { code?: string }).code ?? ERROR_CODES.INTERNAL;
    const status = code === ERROR_CODES.VALIDATION_ERROR ? 400
      : code === ERROR_CODES.CONFLICT ? 409
      : code === ERROR_CODES.NOT_FOUND ? 404
      : code === ERROR_CODES.UNAUTHORIZED ? 401
      : 500;
    return reply.status(status).send(formatErrorResponse(
      code,
      (err as Error).message || "Internal server error",
      (err as { details?: unknown }).details
    ));
  });
}
