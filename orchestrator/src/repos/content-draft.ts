import type { Prisma, PrismaClient } from "@prisma/client";

export type UpsertContentDraftInput = {
  jobId: string;
  outline?: string | null;
  body?: string | null;
  reviewNotes?: string | null;
  decision?: string | null;
  topicScore?: number | null;
  reviewScore?: number | null;
};

export type ListContentDraftsForApiInput = {
  jobId?: string;
  jobStatus?: string;
  jobSourceType?: string;
  limit: number;
  offset: number;
};

const listInclude = {
  job: {
    select: {
      id: true,
      status: true,
      decision: true,
      sourceType: true,
      completedAt: true,
    },
  },
} as const;

function buildContentDraftWhere(input: ListContentDraftsForApiInput): Prisma.ContentDraftWhereInput {
  const jobFilter: { status?: string; sourceType?: string } = {};
  if (input.jobStatus) jobFilter.status = input.jobStatus;
  if (input.jobSourceType) jobFilter.sourceType = input.jobSourceType;
  return {
    ...(input.jobId ? { jobId: input.jobId } : {}),
    ...(Object.keys(jobFilter).length > 0 ? { job: jobFilter } : {}),
  };
}

export function createContentDraftRepo(db: PrismaClient) {
  return {
    async listPagedForApi(input: ListContentDraftsForApiInput) {
      const where = buildContentDraftWhere(input);
      const [rows, total] = await Promise.all([
        db.contentDraft.findMany({
          where,
          take: input.limit,
          skip: input.offset,
          orderBy: { updatedAt: "desc" },
          include: listInclude,
        }),
        db.contentDraft.count({ where }),
      ]);
      return { rows, total };
    },

    async upsert(input: UpsertContentDraftInput) {
      return db.contentDraft.upsert({
        where: { jobId: input.jobId },
        create: {
          jobId: input.jobId,
          outline: input.outline ?? null,
          body: input.body ?? null,
          reviewNotes: input.reviewNotes ?? null,
          decision: input.decision ?? null,
          topicScore: input.topicScore ?? null,
          reviewScore: input.reviewScore ?? null,
        },
        update: {
          outline: input.outline ?? null,
          body: input.body ?? null,
          reviewNotes: input.reviewNotes ?? null,
          decision: input.decision ?? null,
          topicScore: input.topicScore ?? null,
          reviewScore: input.reviewScore ?? null,
        },
      });
    },
  };
}
