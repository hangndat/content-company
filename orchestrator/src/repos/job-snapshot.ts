import type { PrismaClient } from "@prisma/client";

export type CreateSnapshotInput = {
  jobId: string;
  step: string;
  stateJson: object;
};

export function createJobSnapshotRepo(db: PrismaClient) {
  return {
    async create(input: CreateSnapshotInput) {
      return db.jobStateSnapshot.create({
        data: {
          jobId: input.jobId,
          step: input.step,
          stateJson: input.stateJson as object,
        },
      });
    },

    async getLatest(jobId: string) {
      return db.jobStateSnapshot.findFirst({
        where: { jobId },
        orderBy: { createdAt: "desc" },
      });
    },

    async getByStep(jobId: string, step: string) {
      return db.jobStateSnapshot.findFirst({
        where: { jobId, step },
        orderBy: { createdAt: "desc" },
      });
    },

    async listByJobId(jobId: string) {
      return db.jobStateSnapshot.findMany({
        where: { jobId },
        orderBy: { createdAt: "asc" },
      });
    },
  };
}
