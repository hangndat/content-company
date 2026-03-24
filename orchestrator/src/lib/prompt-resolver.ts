import type { PrismaClient } from "@prisma/client";
import {
  getPromptWithExperiments,
  type ResolverContext,
} from "../experiments/resolver.js";

import type { ExperimentAssignmentMeta } from "../experiments/assignment-meta.js";

export type PromptResult = {
  content: string;
  version: number;
  experimentAssignments?: Record<string, ExperimentAssignmentMeta>;
};

export type GetPromptOptions = {
  context?: ResolverContext;
};

/**
 * Resolves prompt: uses experiment arm if running experiment matches, else active prompt.
 * Pass context for experiment-aware resolution. Without context, falls back to active prompt.
 */
export async function getPrompt(
  db: PrismaClient,
  type: string,
  placeholders: Record<string, string>,
  options?: GetPromptOptions
): Promise<PromptResult> {
  if (options?.context) {
    return getPromptWithExperiments(db, type as "planner" | "scorer" | "writer" | "reviewer", placeholders, options.context);
  }

  const { createPromptVersionRepo } = await import("../repos/prompt-version.js");
  const repo = createPromptVersionRepo(db);
  const active = await repo.getActiveWithVersion(type);
  const DEFAULTS: Record<string, string> = {
    planner: `You are a content planner. Given source items, extract the main topic and create a brief outline for an article.

Source items (JSON):
{{SOURCE_ITEMS}}

Respond with JSON only:
{
  "topic": "main topic in one sentence",
  "outline": "bullet point outline for the article, 3-5 points"
}`,
    scorer: `You are a content opportunity scorer. Rate how worthwhile it is to publish content on this topic (0-1).

Topic/Outline:
{{OUTLINE}}

{{FEEDBACK_SECTION}}

Consider: relevance, interest, uniqueness, potential value to readers.

Respond with JSON only:
{
  "topicScore": 0.0 to 1.0
}`,
    writer: `You are a content writer. Create a draft article based on the outline and source material.

Outline:
{{OUTLINE}}

Source summary:
{{SOURCE_SUMMARY}}

Write a clear, informative article. 300-500 words. Use markdown formatting.`,
    reviewer: `You are a content quality reviewer. Evaluate the draft on: clarity, logic, format, no repetition, no spam/risk.

Draft:
{{DRAFT}}

Respond with JSON only:
{
  "reviewScore": 0.0 to 1.0,
  "reviewNotes": "brief notes on quality",
  "riskFlag": false
}`,
  };
  const template = active.content ?? DEFAULTS[type] ?? "";
  const content = Object.entries(placeholders).reduce(
    (acc, [key, val]) => acc.replace(new RegExp(`{{${key}}}`, "g"), val),
    template
  );
  return { content, version: active.version };
}
