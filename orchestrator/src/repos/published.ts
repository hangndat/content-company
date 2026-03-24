import type { PrismaClient } from "@prisma/client";

export type CreatePublishedInput = {
  jobId: string;
  channelId: string;
  status: string;
  publishRef?: string;
  publishedAt?: Date;
};

export type UpdatePublishedInput = {
  status?: string;
  publishRef?: string;
  publishedAt?: Date;
};

export function createPublishedRepo(db: PrismaClient) {
  return {
    async create(input: CreatePublishedInput) {
      return db.publishedContent.create({
        data: {
          jobId: input.jobId,
          channelId: input.channelId,
          status: input.status,
          publishRef: input.publishRef,
          publishedAt: input.publishedAt,
        },
      });
    },

    async findById(id: string) {
      return db.publishedContent.findUnique({
        where: { id },
      });
    },

    async findByJobId(jobId: string) {
      return db.publishedContent.findMany({
        where: { jobId },
      });
    },

    async update(id: string, input: UpdatePublishedInput) {
      return db.publishedContent.update({
        where: { id },
        data: input,
      });
    },

    async hasPublishedForJob(jobId: string): Promise<boolean> {
      const count = await db.publishedContent.count({
        where: { jobId, status: "published" },
      });
      return count > 0;
    },
  };
}
