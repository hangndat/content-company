import type { PrismaClient } from "@prisma/client";
import type { NormalizedItem } from "../graph/types.js";
import { crawledArticleDedupeKey, type CrawlItemShape } from "../lib/crawled-article-key.js";

export async function ingestCrawledArticles(
  db: PrismaClient,
  trendDomain: string,
  items: CrawlItemShape[]
): Promise<void> {
  for (const item of items) {
    const dedupeKey = crawledArticleDedupeKey(trendDomain, item);
    const bodyPreview = (item.body ?? "").slice(0, 4000);
    await db.crawledArticle.upsert({
      where: { dedupeKey },
      create: {
        dedupeKey,
        trendDomain,
        url: item.url ? item.url.slice(0, 2048) : null,
        title: item.title.slice(0, 512),
        bodyPreview: bodyPreview || null,
        sourceId: item.sourceId?.slice(0, 128) ?? null,
        rawPayload: item as object,
      },
      update: {
        title: item.title.slice(0, 512),
        bodyPreview: bodyPreview || null,
        url: item.url ? item.url.slice(0, 2048) : null,
        sourceId: item.sourceId?.slice(0, 128) ?? null,
        rawPayload: item as object,
      },
    });
  }
}

export async function filterRawItemsForTrendDedup(
  db: PrismaClient,
  trendDomain: string,
  items: CrawlItemShape[],
  opts: { enabled: boolean; skip: boolean; dedupHours: number }
): Promise<{ kept: CrawlItemShape[]; dropped: number }> {
  if (!opts.enabled || opts.skip) {
    return { kept: items, dropped: 0 };
  }
  const cutoffMs = opts.dedupHours * 3600_000;
  const now = Date.now();
  const kept: CrawlItemShape[] = [];
  for (const item of items) {
    const key = crawledArticleDedupeKey(trendDomain, item);
    const row = await db.crawledArticle.findUnique({
      where: { dedupeKey: key },
      select: { processedForTrendAt: true },
    });
    const processedAt = row?.processedForTrendAt?.getTime();
    if (processedAt != null && now - processedAt < cutoffMs) {
      continue;
    }
    kept.push(item);
  }
  return { kept, dropped: items.length - kept.length };
}

export async function markNormalizedItemsProcessedForTrend(
  db: PrismaClient,
  trendDomain: string,
  items: NormalizedItem[]
): Promise<void> {
  const now = new Date();
  for (const item of items) {
    const key = crawledArticleDedupeKey(trendDomain, {
      title: item.title,
      body: item.body,
      url: item.url,
    });
    await db.crawledArticle.updateMany({
      where: { dedupeKey: key },
      data: { processedForTrendAt: now },
    });
  }
}
