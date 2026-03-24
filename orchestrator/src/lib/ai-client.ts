import OpenAI from "openai";
import { observeOpenAI } from "langfuse";
import type { Env } from "../config/env.js";

let openaiSingleton: OpenAI | null = null;

export type CallAIMeta = {
  step: "planner" | "scorer" | "writer" | "reviewer";
  jobId: string;
  traceId: string;
};

function getOpenAISingleton(apiKey: string): OpenAI {
  if (!openaiSingleton) {
    openaiSingleton = new OpenAI({ apiKey });
  }
  return openaiSingleton;
}

function createChatClient(apiKey: string, env: Env, meta?: CallAIMeta): OpenAI {
  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) {
    return getOpenAISingleton(apiKey);
  }
  const base = new OpenAI({ apiKey });
  return observeOpenAI(base, {
    traceName: `graph.${meta?.step ?? "llm"}`,
    sessionId: meta?.jobId,
    metadata: meta
      ? { jobId: meta.jobId, step: meta.step, traceId: meta.traceId }
      : undefined,
    tags: meta ? [meta.step] : undefined,
    clientInitParams: {
      publicKey: env.LANGFUSE_PUBLIC_KEY,
      secretKey: env.LANGFUSE_SECRET_KEY,
      baseUrl: env.LANGFUSE_HOST,
    },
  });
}

async function flushIfObserved(client: OpenAI): Promise<void> {
  const maybe = client as OpenAI & { flushAsync?: () => Promise<void> };
  if (typeof maybe.flushAsync === "function") {
    await maybe.flushAsync().catch(() => undefined);
  }
}

export async function callAI(
  prompt: string,
  ctx: { logger: import("pino").Logger; env: Env },
  meta?: CallAIMeta
): Promise<string> {
  const { env } = ctx;
  const apiKey = env.OPENAI_API_KEY;
  const primaryModel = env.OPENAI_MODEL_PRIMARY;
  const fallbackModel = env.OPENAI_MODEL_FALLBACK;

  const client = createChatClient(apiKey, env, meta);

  const models = [primaryModel, fallbackModel];
  const maxRetries = 2;
  let lastErr: Error | null = null;

  try {
    for (const model of models) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const completion = await client.chat.completions.create({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          });
          const content = completion.choices[0]?.message?.content?.trim();
          if (content) return content;
        } catch (err) {
          lastErr = err as Error;
          ctx.logger.warn({ err, model, attempt }, "AI call failed");
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          } else if (model !== fallbackModel) {
            ctx.logger.info("Trying fallback model");
          }
        }
      }
    }

    throw lastErr ?? new Error("AI call failed");
  } finally {
    await flushIfObserved(client);
  }
}
