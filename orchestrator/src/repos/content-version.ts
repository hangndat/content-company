import type { PrismaClient } from "@prisma/client";

export type CreateContentVersionInput = {
  jobId: string;
  version: number;
  draft?: string;
  reviewScore?: number;
};

export function createContentVersionRepo(db: PrismaClient) {
  return {
    async create(input: CreateContentVersionInput) {
      return db.contentVersion.create({
        data: {
          jobId: input.jobId,
          version: input.version,
          draft: input.draft,
          reviewScore: input.reviewScore,
        },
      });
    },

    async getNextVersion(jobId: string): Promise<number> {
      const last = await db.contentVersion.findFirst({
        where: { jobId },
        orderBy: { version: "desc" },
      });
      return (last?.version ?? 0) + 1;
    },

    async listByJobId(jobId: string) {
      return db.contentVersion.findMany({
        where: { jobId },
        orderBy: { version: "asc" },
      });
    },
  };
}
