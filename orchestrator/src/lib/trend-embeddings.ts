import OpenAI from "openai";
import { observeOpenAI } from "langfuse";
import type { Env } from "../config/env.js";
import { flushOpenAITracedClient } from "./openai-langfuse-flush.js";

const BATCH_SIZE = 100;
const TOPIC_TEXT_MAX = 500;

let embeddingClient: OpenAI | null = null;

function getEmbeddingClient(apiKey: string): OpenAI {
  if (!embeddingClient) {
    embeddingClient = new OpenAI({ apiKey });
  }
  return embeddingClient;
}

export type TrendEmbeddingLangfuseStep = "trend_item_embedding" | "trend_refine_embedding";

export type TrendEmbeddingLangfuseContext = {
  env: Env;
  jobId: string;
  traceId: string;
  step: TrendEmbeddingLangfuseStep;
  /** Log lỗi API (message), không log body input. */
  logger?: import("pino").Logger;
};

function createClientForEmbeddings(
  apiKey: string,
  lf: TrendEmbeddingLangfuseContext | undefined,
  model: string,
  textCount: number
): { client: OpenAI; observed: boolean } {
  const batchCount =
    textCount === 0 ? 0 : Math.ceil(textCount / BATCH_SIZE);
  if (
    lf &&
    lf.env.LANGFUSE_PUBLIC_KEY &&
    lf.env.LANGFUSE_SECRET_KEY
  ) {
    const base = new OpenAI({ apiKey });
    const client = observeOpenAI(base, {
      traceName: `graph.${lf.step}`,
      sessionId: lf.jobId,
      metadata: {
        jobId: lf.jobId,
        traceId: lf.traceId,
        step: lf.step,
        model,
        textCount,
        batchCount,
      },
      tags: [lf.step],
      clientInitParams: {
        publicKey: lf.env.LANGFUSE_PUBLIC_KEY,
        secretKey: lf.env.LANGFUSE_SECRET_KEY,
        baseUrl: lf.env.LANGFUSE_HOST,
      },
    });
    return { client, observed: true };
  }
  return { client: getEmbeddingClient(apiKey), observed: false };
}

export function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

/** L2-normalize copy */
export function l2Normalize(v: number[]): number[] {
  let s = 0;
  for (const x of v) s += x * x;
  const n = Math.sqrt(s);
  if (n === 0) return [...v];
  return v.map((x) => x / n);
}

/** Average of L2-normalized vectors, then L2-normalize. */
export function averageNormalizedEmbeddings(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0]!.length;
  const acc = new Array(dim).fill(0);
  for (const raw of vectors) {
    const u = l2Normalize(raw);
    for (let i = 0; i < dim; i++) acc[i]! += u[i]!;
  }
  for (let i = 0; i < dim; i++) acc[i]! /= vectors.length;
  return l2Normalize(acc);
}

/**
 * Batch embeddings for trend topic strings. Returns null on total failure, or array aligned with `texts`.
 * Langfuse: bọc `observeOpenAI` khi có LANGFUSE_* (giống chat).
 */
export async function embedTrendTopicTexts(
  apiKey: string,
  model: string,
  texts: string[],
  langfuse?: TrendEmbeddingLangfuseContext
): Promise<number[][] | null> {
  if (texts.length === 0) return [];
  const trimmed = texts.map((t) => t.slice(0, TOPIC_TEXT_MAX));
  const { client, observed } = createClientForEmbeddings(
    apiKey,
    langfuse,
    model,
    trimmed.length
  );
  const out: number[][] = [];

  try {
    for (let offset = 0; offset < trimmed.length; offset += BATCH_SIZE) {
      const batch = trimmed.slice(offset, offset + BATCH_SIZE);
      const resp = await client.embeddings.create({
        model,
        input: batch,
      });
      const chunk: (number[] | undefined)[] = new Array(batch.length);
      for (const item of resp.data) {
        const j = item.index;
        if (j >= 0 && j < batch.length && item.embedding) {
          chunk[j] = item.embedding;
        }
      }
      if (chunk.some((v) => v == null)) {
        return null;
      }
      out.push(...(chunk as number[][]));
    }
    return out;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    langfuse?.logger?.warn(
      { err, model, step: langfuse.step, textCount: trimmed.length, message },
      "Trend embedding API failed"
    );
    return null;
  } finally {
    if (observed) {
      await flushOpenAITracedClient(client);
    }
  }
}

export { TOPIC_TEXT_MAX };
