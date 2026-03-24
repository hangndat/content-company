import type OpenAI from "openai";

/** Langfuse `observeOpenAI` gắn `flushAsync` lên client — gọi sau khi xong batch API. */
export async function flushOpenAITracedClient(client: OpenAI): Promise<void> {
  const maybe = client as OpenAI & { flushAsync?: () => Promise<void> };
  if (typeof maybe.flushAsync === "function") {
    await maybe.flushAsync().catch(() => undefined);
  }
}
