import Parser from "rss-parser";

export type RssRawItem = {
  title: string;
  body: string;
  url?: string;
  publishedAt?: string;
};

function stripHtml(s: string): string {
  return s
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickBody(item: Parser.Item): string {
  const ext = item as Parser.Item & { "content:encoded"?: string; description?: string };
  const raw =
    ext["content:encoded"] || item.content || item.summary || ext.description || "";
  const text = stripHtml(typeof raw === "string" ? raw : "");
  return text;
}

/**
 * Fetch RSS/Atom URL and map entries to trend raw items.
 * Drops entries without resolvable URL (trend domain profiles need url or explicit sourceId).
 * Drops bodies shorter than minBodyLen (content graph normalize).
 */
export async function fetchRssAsRawItems(
  feedUrl: string,
  opts?: { limit?: number; timeoutMs?: number; minBodyLen?: number }
): Promise<{ items: RssRawItem[]; skippedShortBody: number; skippedNoUrl: number }> {
  const limit = Math.min(Math.max(opts?.limit ?? 40, 1), 100);
  const timeoutMs = opts?.timeoutMs ?? 25_000;
  const minBodyLen = opts?.minBodyLen ?? 50;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let xml: string;
  try {
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent": "ContentCompany-Orchestrator/1.0 (+https://github.com/)",
      },
    });
    if (!res.ok) {
      throw new Error(`RSS HTTP ${res.status}`);
    }
    xml = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const parser = new Parser({
    timeout: timeoutMs,
    headers: {
      "User-Agent": "ContentCompany-Orchestrator/1.0",
    },
  });
  const feed = await parser.parseString(xml);

  let skippedShortBody = 0;
  let skippedNoUrl = 0;
  const items: RssRawItem[] = [];

  for (const entry of feed.items ?? []) {
    if (items.length >= limit) break;
    const link = entry.link?.trim();
    if (!link) {
      skippedNoUrl += 1;
      continue;
    }
    const title = (entry.title ?? "").trim() || "(Không tiêu đề)";
    const body = pickBody(entry);
    if (body.length < minBodyLen) {
      skippedShortBody += 1;
      continue;
    }
    let publishedAt: string | undefined;
    if (entry.pubDate) {
      const d = new Date(entry.pubDate);
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    }
    items.push({
      title,
      body,
      url: link,
      ...(publishedAt ? { publishedAt } : {}),
    });
  }

  return { items, skippedShortBody, skippedNoUrl };
}
