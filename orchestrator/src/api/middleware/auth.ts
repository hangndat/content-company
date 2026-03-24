import type { FastifyRequest, FastifyReply } from "fastify";

const PUBLIC_PATHS = ["/health", "/ready"];

export function createAuthMiddleware(apiKey?: string) {
  return async function authMiddleware(
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!apiKey) {
      return; // No auth configured, skip
    }
    if (PUBLIC_PATHS.some((p) => req.url.startsWith(p))) {
      return; // Health/ready are public
    }
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;
    if (token !== apiKey) {
      return reply.status(401).send({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid or missing API key",
          details: {},
        },
      });
    }
  };
}
