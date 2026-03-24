import type { GraphState } from "../types.js";
import type { GraphContext } from "../types.js";
import { callAI } from "../../lib/ai-client.js";
import { getPrompt } from "../../lib/prompt-resolver.js";

export async function planner(
  state: GraphState,
  ctx: GraphContext
): Promise<Partial<GraphState>> {
  const items = state.normalizedItems;
  if (items.length === 0) {
    return {};
  }

  const sourceText = JSON.stringify(
    items.map((i) => ({ title: i.title, body: i.body.slice(0, 500) })),
    null,
    2
  );

  const { content: prompt, version, experimentAssignments } = await getPrompt(
    ctx.db,
    "planner",
    { SOURCE_ITEMS: sourceText },
    {
      context: {
        jobId: state.jobId,
        channel: state.channel,
        sourceType: state.sourceType,
      },
    }
  );
  const response = await callAI(prompt, ctx, {
    step: "planner",
    jobId: state.jobId,
    traceId: state.traceId,
  });

  const delta: Partial<GraphState> = {
    outline: response,
    promptVersions: { planner: version },
    ...(experimentAssignments && { experimentAssignments }),
  };
  try {
    const parsed = JSON.parse(response) as { topic?: string; outline?: string };
    delta.outline = [parsed.topic, parsed.outline].filter(Boolean).join("\n\n");
  } catch {
    /* keep raw response */
  }
  return delta;
}
