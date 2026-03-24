import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import { z } from "zod";
import type { createPromptVersionRepo } from "../../repos/prompt-version.js";
import {
  PromptDryRunError,
  runPromptDryRun,
  type PromptDryRunType,
} from "../../services/prompt-dry-run.js";
import type { Env } from "../../config/env.js";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";

const dryRunBodySchema = z.object({
  sourceJobId: z.string().min(1),
  snapshotStep: z.string().min(1),
  promptContent: z.string().min(1),
});

export async function registerPromptVersionRoutes(
  app: FastifyInstance,
  deps: {
    promptVersionRepo: ReturnType<typeof createPromptVersionRepo>;
    db: PrismaClient;
    logger: Logger;
    env: Env;
  }
) {
  const repo = deps.promptVersionRepo;

  app.get("/v1/prompts", async () => {
    const types = repo.PROMPT_TYPES;
    const result: Record<string, unknown[]> = {};
    for (const type of types) {
      result[type] = (await repo.listByType(type)).map((p) => ({
        id: p.id,
        version: p.version,
        isActive: p.isActive,
        createdAt: p.createdAt,
      }));
    }
    return result;
  });

  app.get<{ Params: { type: string } }>("/v1/prompts/:type", async (req, reply) => {
    const { type } = req.params;
    const list = await repo.listByType(type);
    if (list.length === 0) {
      return reply.status(404).send(
        formatErrorResponse(ERROR_CODES.NOT_FOUND, "No prompt versions found", { type })
      );
    }
    return list.map((p) => ({
      id: p.id,
      version: p.version,
      content: p.content,
      isActive: p.isActive,
      createdAt: p.createdAt,
    }));
  });

  app.post<{
    Params: { type: string };
    Body: { content?: string; setActive?: boolean };
  }>("/v1/prompts/:type", async (req, reply) => {
    const { type } = req.params;
    const { content, setActive } = req.body ?? {};
    if (!content) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "content is required", {})
      );
    }

    const version = await repo.nextVersionNumber(type);

    const created = await repo.create({
      type,
      version,
      content,
      isActive: setActive ?? false,
    });

    if (setActive) {
      await repo.setActive(type, version);
    }

    return { id: created.id, type, version, isActive: created.isActive };
  });

  app.post<{
    Params: { type: string };
    Body: unknown;
  }>("/v1/prompts/:type/dry-run", async (req, reply) => {
    const { type } = req.params;
    if (!repo.PROMPT_TYPES.includes(type as (typeof repo.PROMPT_TYPES)[number])) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid prompt type", { type })
      );
    }

    const parsed = dryRunBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "Invalid request body", parsed.error.flatten())
      );
    }

    try {
      const result = await runPromptDryRun({
        db: deps.db,
        logger: deps.logger,
        env: deps.env,
        promptType: type as PromptDryRunType,
        sourceJobId: parsed.data.sourceJobId,
        snapshotStep: parsed.data.snapshotStep,
        promptContent: parsed.data.promptContent,
      });
      return { output: result.output, traceId: result.traceId };
    } catch (e) {
      if (e instanceof PromptDryRunError) {
        const status =
          e.code === "NOT_FOUND" || e.code === "SNAPSHOT_NOT_FOUND"
            ? 404
            : 400;
        const code =
          e.code === "NOT_FOUND" || e.code === "SNAPSHOT_NOT_FOUND"
            ? ERROR_CODES.NOT_FOUND
            : ERROR_CODES.VALIDATION_ERROR;
        return reply.status(status).send(formatErrorResponse(code, e.message, { code: e.code }));
      }
      throw e;
    }
  });

  app.post<{
    Params: { type: string };
    Body: { version?: number };
  }>("/v1/prompts/:type/activate", async (req, reply) => {
    const { type } = req.params;
    const { version } = req.body ?? {};
    if (version == null) {
      return reply.status(400).send(
        formatErrorResponse(ERROR_CODES.VALIDATION_ERROR, "version is required", {})
      );
    }

    await repo.setActive(type, version);
    return { type, version, isActive: true };
  });
}
