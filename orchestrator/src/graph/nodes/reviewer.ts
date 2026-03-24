import type { GraphState } from "../types.js";
import type { GraphContext } from "../types.js";
import { callAI } from "../../lib/ai-client.js";
import { getPrompt } from "../../lib/prompt-resolver.js";
import { extractTopicIdentifiers } from "../../lib/topic-key.js";

export async function reviewer(
  state: GraphState,
  ctx: GraphContext
): Promise<Partial<GraphState>> {
  const draft = state.draft ?? "";
  if (!draft) {
    return { reviewScore: 0, riskFlag: true };
  }

  const { topicKey } = extractTopicIdentifiers(state.outline ?? "");
  const { content: prompt, version, experimentAssignments } = await getPrompt(
    ctx.db,
    "reviewer",
    { DRAFT: draft.slice(0, 2000) },
    {
      context: {
        jobId: state.jobId,
        channel: state.channel,
        topicKey,
        sourceType: state.sourceType,
      },
    }
  );
  const response = await callAI(prompt, ctx, {
    step: "reviewer",
    jobId: state.jobId,
    traceId: state.traceId,
  });

  const base = {
    promptVersions: { reviewer: version },
    ...(experimentAssignments && { experimentAssignments }),
  };
  try {
    const parsed = JSON.parse(response) as {
      reviewScore?: number;
      reviewNotes?: string;
      riskFlag?: boolean;
    };
    const score =
      typeof parsed.reviewScore === "number"
        ? Math.max(0, Math.min(1, parsed.reviewScore))
        : 0.5;
    return {
      reviewScore: score,
      reviewNotes: parsed.reviewNotes ?? "",
      riskFlag: parsed.riskFlag ?? false,
      ...base,
    };
  } catch {
    return {
      reviewScore: 0.5,
      reviewNotes: "Parse failed",
      riskFlag: false,
      ...base,
    };
  }
}
