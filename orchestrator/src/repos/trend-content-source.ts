import type { PrismaClient } from "@prisma/client";

export type TrendContentSourceUpdateInput = {
  trendDomain?: string;
  kind?: string;
  label?: string | null;
  feedUrl?: string;
  enabled?: boolean;
  lastFetchedAt?: Date | null;
  lastItemCount?: number | null;
  lastError?: string | null;
};

export type TrendContentSourceRow = {
  id: string;
  trendDomain: string;
  kind: string;
  label: string | null;
  feedUrl: string;
  enabled: boolean;
  lastFetchedAt: Date | null;
  lastItemCount: number | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function createTrendContentSourceRepo(db: PrismaClient) {
  return {
    async listPaged(input: { domain?: string; limit: number; offset: number }) {
      const where = {
        ...(input.domain ? { trendDomain: input.domain } : {}),
      };
      const [rows, total] = await Promise.all([
        db.trendContentSource.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        db.trendContentSource.count({ where }),
      ]);
      return { rows, total };
    },

    async findById(id: string): Promise<TrendContentSourceRow | null> {
      return db.trendContentSource.findUnique({ where: { id } });
    },

    async create(data: {
      trendDomain: string;
      kind?: string;
      label?: string | null;
      feedUrl: string;
      enabled?: boolean;
    }) {
      return db.trendContentSource.create({
        data: {
          trendDomain: data.trendDomain,
          kind: data.kind ?? "rss",
          label: data.label ?? null,
          feedUrl: data.feedUrl,
          enabled: data.enabled ?? true,
        },
      });
    },

    async update(id: string, data: TrendContentSourceUpdateInput) {
      return db.trendContentSource.update({
        where: { id },
        data,
      });
    },

    async delete(id: string) {
      await db.trendContentSource.delete({ where: { id } });
    },
  };
}
