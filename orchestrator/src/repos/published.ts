import type { Prisma, PrismaClient } from "@prisma/client";

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

    async listPagedWithJob(input: {
      limit: number;
      offset: number;
      status?: string;
      from?: string;
      to?: string;
    }) {
      const where: Prisma.PublishedContentWhereInput = {};
      if (input.status) where.status = input.status;
      if (input.from || input.to) {
        where.createdAt = {};
        if (input.from) {
          const d = new Date(input.from);
          d.setHours(0, 0, 0, 0);
          where.createdAt.gte = d;
        }
        if (input.to) {
          const d = new Date(input.to);
          d.setHours(23, 59, 59, 999);
          where.createdAt.lte = d;
        }
      }

      const [items, total] = await Promise.all([
        db.publishedContent.findMany({
          where,
          include: {
            job: {
              select: { id: true, status: true, decision: true, createdAt: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        db.publishedContent.count({ where }),
      ]);
      return { items, total };
    },
  };
}
