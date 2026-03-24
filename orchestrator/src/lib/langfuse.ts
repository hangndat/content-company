import { Langfuse } from "langfuse";
import type { Env } from "../config/env.js";

let langfuse: Langfuse | null = null;

export function getLangfuse(env: Env): Langfuse | null {
  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) {
    return null;
  }
  if (!langfuse) {
    langfuse = new Langfuse({
      publicKey: env.LANGFUSE_PUBLIC_KEY,
      secretKey: env.LANGFUSE_SECRET_KEY,
      baseUrl: env.LANGFUSE_HOST,
    });
  }
  return langfuse;
}
