import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Env } from "../../config/env.js";
import {
  fetchLangfuseUsageSummary,
  langfuseObservabilityEnabled,
  langfusePublicUiUrl,
} from "../../lib/langfuse-observability.js";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";

const observabilityQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
});

export async function registerObservabilityRoutes(app: FastifyInstance, env: Env): Promise<void> {
  app.get("/v1/settings/observability", async (request, reply) => {
    const parsed = observabilityQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid query params", parsed.error.flatten())
      );
    }
    const q = parsed.data;
    const enabled = langfuseObservabilityEnabled(env);
    const uiUrl = langfusePublicUiUrl(env);

    const to = new Date();
    const from = new Date(to.getTime() - q.days * 24 * 60 * 60 * 1000);
    const usage = enabled ? await fetchLangfuseUsageSummary(env, { from, to }) : null;

    return {
      enabled,
      uiUrl,
      days: q.days,
      usage,
    };
  });
}
