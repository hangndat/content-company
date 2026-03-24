import OpenAI from "openai";
import type { Env } from "../config/env.js";

let openai: OpenAI | null = null;

export function getOpenAI(apiKey: string): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export async function callAI(
  prompt: string,
  ctx: { logger: import("pino").Logger; env: Env }
): Promise<string> {
  const { env } = ctx;
  const apiKey = env.OPENAI_API_KEY;
  const primaryModel = env.OPENAI_MODEL_PRIMARY;
  const fallbackModel = env.OPENAI_MODEL_FALLBACK;

  const client = getOpenAI(apiKey);

  const models = [primaryModel, fallbackModel];
  const maxRetries = 2;
  let lastErr: Error | null = null;

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
}
