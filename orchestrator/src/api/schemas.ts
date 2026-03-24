import { z } from "zod";
import { resolveTrendSourceId } from "../trends/domain-profiles.js";

/** Parse date from RSS formats: RFC 2822, ISO 8601, dd/mm/yyyy (Tinthethao), yyyy/mm/dd (Bongda24h) */
function parsePubDate(str: string): Date | null {
  if (!str || typeof str !== "string" || !str.trim()) return null;
  const s = str.trim();
  let d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  // dd/mm/yyyy HH:mm:ss (Tinthethao)
  const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy, hh, mi, ss] = ddmmyyyy;
    d = new Date(parseInt(yyyy!, 10), parseInt(mm!, 10) - 1, parseInt(dd!, 10), parseInt(hh!, 10), parseInt(mi!, 10), parseInt(ss!, 10));
    if (!Number.isNaN(d.getTime())) return d;
  }
  // yyyy/mm/dd HH:mm:ss (Bongda24h)
  const yyyymmdd = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (yyyymmdd) {
    const [, yyyy, mm, dd, hh, mi, ss] = yyyymmdd;
    d = new Date(parseInt(yyyy!, 10), parseInt(mm!, 10) - 1, parseInt(dd!, 10), parseInt(hh!, 10), parseInt(mi!, 10), parseInt(ss!, 10));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

const publishedAtSchema = z
  .string()
  .optional()
  .transform((v) => {
    if (!v || typeof v !== "string") return undefined;
    const d = parsePubDate(v);
    return d ? d.toISOString() : undefined;
  });

export const rawItemSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  body: z.string().default(""),
  url: z.string().url().optional(),
  publishedAt: publishedAtSchema,
  sourceId: z.string().optional(),
  /** Gắn bài crawl với một dòng Nguồn RSS (admin); ưu tiên hơn `trendContentSourceId` ở body job. */
  trendContentSourceId: z.string().uuid().optional(),
});

export const channelSchema = z.object({
  id: z.string(),
  type: z.enum(["blog", "social", "affiliate"]),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const runTrendJobBodySchema = z
  .object({
    jobId: z.string().uuid().optional(),
    traceId: z.string().uuid().optional(),
    /** Profile trend: mặc định sports-vn; domain mới thêm vào orchestrator/src/trends/domain-profiles.ts */
    domain: z.string().min(1).max(64).optional().default("sports-vn"),
    rawItems: z.array(rawItemSchema),
    channel: channelSchema.optional(),
    /** Bỏ qua lọc bài đã xử lý trend gần đây (theo bảng crawled_article). */
    skipArticleDedup: z.boolean().optional(),
    /** Liên kết bài crawl tới bản ghi Nguồn RSS (admin); phải trùng `domain` với nguồn. */
    trendContentSourceId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const domain = data.domain ?? "sports-vn";
    data.rawItems.forEach((item, index) => {
      const resolved = resolveTrendSourceId(domain, item.url, item.sourceId);
      if (resolved === "unknown") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Each item needs a resolvable source: provide sourceId, or a valid url that maps to a known host for this domain.",
          path: ["rawItems", index, "sourceId"],
        });
      }
    });
  });

export const runJobBodySchema = z
  .object({
    jobId: z.string().uuid().optional(),
    traceId: z.string().uuid().optional(),
    sourceType: z.enum(["rss", "webhook", "manual", "api", "trend_aggregate", "trend"]),
    topicHint: z.string().optional(),
    rawItems: z.array(rawItemSchema).optional(),
    trendJobId: z.string().uuid().optional(),
    topicIndex: z.number().int().min(0).optional(),
    publishPolicy: z.enum(["auto", "review_only", "manual_only"]),
    channel: channelSchema,
  })
  .refine(
    (data) => (data.rawItems?.length ?? 0) > 0 || !!data.trendJobId,
    { message: "rawItems or trendJobId required" }
  );

export const approveBodySchema = z.object({
  actor: z.string(),
  reason: z.string().optional(),
});

export const rejectBodySchema = z.object({
  actor: z.string(),
  reason: z.string().min(1),
});

/** Content graph: normalize … decision. Trend graph: normalize, aggregate, embedRefine (shared normalize). */
export const replayBodySchema = z.object({
  fromStep: z
    .enum([
      "normalize",
      "aggregate",
      "embedRefine",
      "planner",
      "scorer",
      "writer",
      "reviewer",
      "decision",
    ])
    .optional(),
});

export type RunJobBody = z.infer<typeof runJobBodySchema>;
export type RunTrendJobBody = z.infer<typeof runTrendJobBodySchema>;
export type ApproveBody = z.infer<typeof approveBodySchema>;
export type RejectBody = z.infer<typeof rejectBodySchema>;
