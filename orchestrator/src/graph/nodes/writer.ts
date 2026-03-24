import type { GraphState } from "../types.js";
import type { GraphContext } from "../types.js";
import { callAI } from "../../lib/ai-client.js";
import { getPrompt } from "../../lib/prompt-resolver.js";
import { extractTopicIdentifiers } from "../../lib/topic-key.js";

export async function writer(
  state: GraphState,
  ctx: GraphContext
): Promise<Partial<GraphState>> {
  const outline = state.outline ?? "";
  if (!outline) {
    return { draft: "" };
  }

  const sourceSummary = state.normalizedItems
    .map((i) => `${i.title}: ${i.body.slice(0, 200)}...`)
    .join("\n\n");

  const { topicKey } = extractTopicIdentifiers(outline);
  const { content: prompt, version, experimentAssignments } = await getPrompt(
    ctx.db,
    "writer",
    { OUTLINE: outline, SOURCE_SUMMARY: sourceSummary },
    {
      context: {
        jobId: state.jobId,
        channel: state.channel,
        topicKey,
        sourceType: state.sourceType,
      },
    }
  );
  const draft = await callAI(prompt, ctx, {
    step: "writer",
    jobId: state.jobId,
    traceId: state.traceId,
  });

  return {
    draft,
    promptVersions: { writer: version },
    ...(experimentAssignments && { experimentAssignments }),
  };
}
