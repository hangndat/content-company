import type { GraphState } from "../types.js";
import type { GraphContext } from "../types.js";
import { callAI } from "../../lib/ai-client.js";
import { getPrompt } from "../../lib/prompt-resolver.js";
import { extractTopicIdentifiers } from "../../lib/topic-key.js";
import { createDailyTopicMetricRepo } from "../../repos/daily-topic-metric.js";

export async function scorer(
  state: GraphState,
  ctx: GraphContext
): Promise<Partial<GraphState>> {
  const outline = state.outline ?? "";
  if (!outline) {
    return { topicScore: 0 };
  }

  const { topicKey, topicSignature } = extractTopicIdentifiers(outline);
  let feedbackSection = "";
  if ((topicKey || topicSignature) && ctx.db) {
    const metricRepo = createDailyTopicMetricRepo(ctx.db);
    const feedback = await metricRepo.getHistoricalFeedback(
      topicKey,
      topicSignature,
      30
    );
    feedbackSection = feedback.promptNote;
  }

  const { content: prompt, version, experimentAssignments } = await getPrompt(
    ctx.db,
    "scorer",
    { OUTLINE: outline, FEEDBACK_SECTION: feedbackSection },
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
    step: "scorer",
    jobId: state.jobId,
    traceId: state.traceId,
  });

  try {
    const parsed = JSON.parse(response) as { topicScore?: number };
    const score =
      typeof parsed.topicScore === "number"
        ? Math.max(0, Math.min(1, parsed.topicScore))
        : 0.5;
    return {
      topicScore: score,
      promptVersions: { scorer: version },
      ...(experimentAssignments && { experimentAssignments }),
    };
  } catch {
    return {
      topicScore: 0.5,
      promptVersions: { scorer: version },
      ...(experimentAssignments && { experimentAssignments }),
    };
  }
}
