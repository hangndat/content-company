import type { Prisma, PrismaClient } from "@prisma/client";

export type ListCrawledArticlesInput = {
  domain?: string;
  q?: string;
  processed: "all" | "yes" | "no";
  /** Lọc theo bản ghi Nguồn RSS (admin). */
  trendContentSourceId?: string;
  limit: number;
  offset: number;
};

const listSelect = {
  id: true,
  dedupeKey: true,
  trendDomain: true,
  url: true,
  title: true,
  bodyPreview: true,
  sourceId: true,
  firstSeenAt: true,
  lastSeenAt: true,
  processedForTrendAt: true,
  trendContentSourceId: true,
  trendContentSource: {
    select: { id: true, label: true, feedUrl: true },
  },
} as const;

function buildCrawledArticleWhere(input: ListCrawledArticlesInput): Prisma.CrawledArticleWhereInput {
  const where: Prisma.CrawledArticleWhereInput = {};
  if (input.domain) where.trendDomain = input.domain;
  if (input.q?.trim()) {
    const s = input.q.trim();
    where.OR = [
      { title: { contains: s, mode: "insensitive" } },
      { url: { contains: s, mode: "insensitive" } },
    ];
  }
  if (input.processed === "yes") where.processedForTrendAt = { not: null };
  if (input.processed === "no") where.processedForTrendAt = null;
  if (input.trendContentSourceId?.trim()) {
    where.trendContentSourceId = input.trendContentSourceId.trim();
  }
  return where;
}

export function createCrawledArticleRepo(db: PrismaClient) {
  return {
    async listPaged(input: ListCrawledArticlesInput) {
      const where = buildCrawledArticleWhere(input);
      const [items, total] = await Promise.all([
        db.crawledArticle.findMany({
          where,
          orderBy: { lastSeenAt: "desc" },
          take: input.limit,
          skip: input.offset,
          select: listSelect,
        }),
        db.crawledArticle.count({ where }),
      ]);
      return { items, total };
    },
  };
}
