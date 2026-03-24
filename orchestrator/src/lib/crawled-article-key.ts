import { createHash } from "node:crypto";

export type CrawlItemShape = {
  title: string;
  body?: string;
  url?: string;
  sourceId?: string;
  trendContentSourceId?: string;
};

/** Khóa ổn định: ưu tiên domain+URL; không có URL thì domain+title+đoạn body. */
export function crawledArticleDedupeKey(trendDomain: string, item: CrawlItemShape): string {
  const dom = trendDomain.trim().toLowerCase();
  const url = (item.url ?? "").trim().toLowerCase();
  if (url) {
    return createHash("sha256").update(`${dom}\0${url}`).digest("hex");
  }
  const title = item.title.trim().toLowerCase().replace(/\s+/g, " ");
  const bodySnippet = (item.body ?? "").trim().slice(0, 500);
  return createHash("sha256").update(`${dom}\0${title}\0${bodySnippet}`).digest("hex");
}
