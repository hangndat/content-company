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
