import type { PrismaClient } from "@prisma/client";

export type CreatePromptInput = {
  type: string;
  version: number;
  content: string;
  isActive?: boolean;
};

const PROMPT_TYPES = ["planner", "scorer", "writer", "reviewer"] as const;

export function createPromptVersionRepo(db: PrismaClient) {
  return {
    async getActive(type: string): Promise<string | null> {
      const row = await db.promptVersion.findFirst({
        where: { type, isActive: true },
        orderBy: { version: "desc" },
      });
      return row?.content ?? null;
    },

    async getActiveWithVersion(type: string): Promise<{ content: string | null; version: number }> {
      const row = await db.promptVersion.findFirst({
        where: { type, isActive: true },
        orderBy: { version: "desc" },
      });
      return {
        content: row?.content ?? null,
        version: row?.version ?? 0,
      };
    },

    async create(input: CreatePromptInput) {
      return db.promptVersion.create({
        data: {
          type: input.type,
          version: input.version,
          content: input.content,
          isActive: input.isActive ?? false,
        },
      });
    },

    async setActive(type: string, version: number) {
      await db.promptVersion.updateMany({
        where: { type },
        data: { isActive: false },
      });
      return db.promptVersion.update({
        where: { type_version: { type, version } },
        data: { isActive: true },
      });
    },

    async listByType(type: string) {
      return db.promptVersion.findMany({
        where: { type },
        orderBy: { version: "desc" },
      });
    },

    PROMPT_TYPES,
  };
}
