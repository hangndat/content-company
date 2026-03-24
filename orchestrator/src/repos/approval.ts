import type { PrismaClient } from "@prisma/client";

export type CreateApprovalInput = {
  jobId: string;
  action: "approve" | "reject";
  actor: string;
  reason?: string;
};

export function createApprovalRepo(db: PrismaClient) {
  return {
    async create(input: CreateApprovalInput) {
      return db.approval.create({
        data: {
          jobId: input.jobId,
          action: input.action,
          actor: input.actor,
          reason: input.reason,
        },
      });
    },

    async listByJobId(jobId: string) {
      return db.approval.findMany({
        where: { jobId },
        orderBy: { createdAt: "desc" },
      });
    },
  };
}
