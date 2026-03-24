import type { PrismaClient } from "@prisma/client";

const jobOutputsInclude = {
  job: {
    select: {
      id: true,
      status: true,
      completedAt: true,
      outputs: { select: { trendCandidates: true } },
    },
  },
} as const;

export function createTrendTopicObservationRepo(db: PrismaClient) {
  return {
    async findByIdWithJobOutputs(id: string) {
      return db.trendTopicObservation.findUnique({
        where: { id },
        include: jobOutputsInclude,
      });
    },

    async listPaged(input: { domain?: string; limit: number; offset: number }) {
      const where = input.domain ? { trendDomain: input.domain } : {};
      const orderBy = [{ articleCount: "desc" as const }, { createdAt: "desc" as const }];
      const [rows, total] = await Promise.all([
        db.trendTopicObservation.findMany({
          where,
          orderBy,
          take: input.limit,
          skip: input.offset,
        }),
        db.trendTopicObservation.count({ where }),
      ]);
      return { rows, total };
    },
  };
}
