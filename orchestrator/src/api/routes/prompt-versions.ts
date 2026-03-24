import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { createPromptVersionRepo } from "../../repos/prompt-version.js";
import { ERROR_CODES, formatErrorResponse } from "../middleware/error.js";

export async function registerPromptVersionRoutes(
  app: FastifyInstance,
  deps: { db: PrismaClient }
) {
  const repo = createPromptVersionRepo(deps.db);

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

    const latest = await deps.db.promptVersion.findFirst({
      where: { type },
      orderBy: { version: "desc" },
    });
    const version = (latest?.version ?? 0) + 1;

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
