import type { PrismaClient } from "@prisma/client";

type ParsedFeed = { id: string; host: string; prefix: string };

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

/** Path key từ URL feed: pathname bỏ .rss/.xml cuối (vd /viet-nam.rss → /viet-nam). */
export function feedPathPrefix(feedUrl: string): { host: string; prefix: string } | null {
  try {
    const u = new URL(feedUrl);
    const host = normalizeHost(u.hostname);
    let p = u.pathname.replace(/\/+$/u, "").toLowerCase();
    if (p.endsWith(".rss")) p = p.slice(0, -4);
    else if (p.endsWith(".xml")) p = p.slice(0, -4);
    return { host, prefix: p };
  } catch {
    return null;
  }
}

function articlePathname(articleUrl: string): { host: string; path: string } | null {
  try {
    const u = new URL(articleUrl);
    return {
      host: normalizeHost(u.hostname),
      path: u.pathname.replace(/\/+$/u, "").toLowerCase() || "/",
    };
  } catch {
    return null;
  }
}

/**
 * Gắn trendContentSourceId cho từng item (chỉ khi chưa có) từ registry enabled + đúng domain.
 * - Một feed duy nhất cho host → dùng luôn.
 * - Nhiều feed cùng host → chọn feed có prefix path dài nhất khớp pathname bài viết.
 */
export function resolveTrendSourceIdForArticleUrl(articleUrl: string, feeds: ParsedFeed[]): string | undefined {
  const loc = articlePathname(articleUrl);
  if (!loc) return undefined;

  const onHost = feeds.filter((f) => f.host === loc.host);
  if (onHost.length === 0) return undefined;
  if (onHost.length === 1) return onHost[0]!.id;

  const matches = onHost.filter(
    (f) => f.prefix && (loc.path === f.prefix || loc.path.startsWith(`${f.prefix}/`))
  );
  if (matches.length > 0) {
    matches.sort((a, b) => b.prefix.length - a.prefix.length);
    return matches[0]!.id;
  }
  /* Không khớp path: nhiều feed cùng host — gắn feed “chung” (thường là …/feed.rss → prefix /feed). */
  if (onHost.length > 1) {
    const mainOnly = onHost.filter((f) => f.prefix === "/feed" || f.prefix === "");
    if (mainOnly.length === 1) return mainOnly[0]!.id;
  }
  return undefined;
}

export type ItemWithOptionalTrendSource = {
  url?: string;
  trendContentSourceId?: string;
};

export async function enrichItemsTrendContentSourceFromRegistry(
  db: PrismaClient,
  trendDomain: string,
  items: ItemWithOptionalTrendSource[]
): Promise<{ enrichedCount: number }> {
  const rows = await db.trendContentSource.findMany({
    where: { trendDomain, enabled: true },
    select: { id: true, feedUrl: true },
  });
  if (rows.length === 0) return { enrichedCount: 0 };

  const feeds: ParsedFeed[] = [];
  for (const r of rows) {
    const p = feedPathPrefix(r.feedUrl);
    if (p) feeds.push({ id: r.id, host: p.host, prefix: p.prefix });
  }
  if (feeds.length === 0) return { enrichedCount: 0 };

  let enrichedCount = 0;
  for (const item of items) {
    if (item.trendContentSourceId || !item.url) continue;
    const id = resolveTrendSourceIdForArticleUrl(item.url, feeds);
    if (id) {
      item.trendContentSourceId = id;
      enrichedCount += 1;
    }
  }
  return { enrichedCount };
}
