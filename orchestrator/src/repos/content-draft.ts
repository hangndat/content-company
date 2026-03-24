import type { PrismaClient } from "@prisma/client";

export type UpsertContentDraftInput = {
  jobId: string;
  outline?: string | null;
  body?: string | null;
  reviewNotes?: string | null;
  decision?: string | null;
  topicScore?: number | null;
  reviewScore?: number | null;
};

export function createContentDraftRepo(db: PrismaClient) {
  return {
    async upsert(input: UpsertContentDraftInput) {
      // Stale `node_modules/.prisma` (e.g. after git pull) leaves this undefined at runtime.
      const contentDraft = db.contentDraft;
      if (!contentDraft) {
        throw new Error(
          "Prisma client has no contentDraft delegate. From repo root run: npm run db:migrate && npm run db:generate, then restart the API and worker."
        );
      }
      return contentDraft.upsert({
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
