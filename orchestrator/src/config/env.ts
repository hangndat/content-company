import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL_PRIMARY: z.string().default("gpt-4o-mini"),
  OPENAI_MODEL_FALLBACK: z.string().default("gpt-3.5-turbo"),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  /** Ingestion / SDK base URL (reachable from orchestrator process). */
  LANGFUSE_HOST: z.string().url().optional().default("https://cloud.langfuse.com"),
  /** Browser URL for Langfuse UI (admin deep link). Defaults to LANGFUSE_HOST when unset. */
  LANGFUSE_UI_PUBLIC_URL: z.string().url().optional(),
  USE_QUEUE: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true")
    .default("false"),
  /** When true, run embedding merge + metadata after trend aggregate. */
  TREND_EMBEDDING_REFINE: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v === "true" || v === "1"),
  TREND_EMBEDDING_MERGE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85),
  TREND_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  TREND_EMBEDDING_STORE: z.enum(["off", "preview", "full"]).default("preview"),
  /** Số nguồn khác nhau tối thiểu trong một cluster (2 = chỉ trend đa nguồn / đa bài cùng ý). */
  TREND_MIN_SOURCES: z.coerce.number().int().min(1).max(20).default(2),
  /** Gom bài theo embedding title + Jaccard (tắt = chỉ Jaccard). */
  TREND_ITEM_SEMANTIC_CLUSTER: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v === "true" || v === "1"),
  /** Ngưỡng cosine giữa embedding hai title để coi là cùng sự kiện (item-level). */
  TREND_ITEM_COSINE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.8),
  /** Lưu bài crawl vào DB; lọc bài đã đưa vào trend thành công gần đây. */
  TREND_CRAWL_DEDUP_ENABLED: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v === "true" || v === "1"),
  /** Giờ: trong khoảng này, bài đã `processed_for_trend_at` sẽ không vào trend job mới. */
  TREND_CRAWL_DEDUP_HOURS: z.coerce.number().int().min(1).max(24 * 365).default(168),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.format());
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}
