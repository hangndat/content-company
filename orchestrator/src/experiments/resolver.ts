import type { PrismaClient } from "@prisma/client";
import { createPromptVersionRepo } from "../repos/prompt-version.js";
import { createExperimentRepo } from "../repos/experiment.js";
import {
  computeBucket,
  findArmForBucket,
  type AssignmentContext,
  type ArmWithBuckets,
} from "./assignment.js";
import type { NodeType } from "./constants.js";

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

import type { ExperimentAssignmentMeta } from "./assignment-meta.js";

export type { ExperimentAssignmentMeta };

export type PromptResult = {
  content: string;
  version: number;
  experimentAssignments?: Record<string, ExperimentAssignmentMeta>;
};

export type ResolverContext = {
  jobId: string;
  channel?: { id?: string; type?: string };
  topicKey?: string;
  sourceType?: string;
};

export async function getPromptWithExperiments(
  db: PrismaClient,
  type: NodeType,
  placeholders: Record<string, string>,
  ctx: ResolverContext
): Promise<PromptResult> {
  const expRepo = createExperimentRepo(db);
  const promptRepo = createPromptVersionRepo(db);

  const assignmentContext: AssignmentContext = {
    jobId: ctx.jobId,
    channelId: ctx.channel?.id,
    topicKey: ctx.topicKey,
    sourceType: ctx.sourceType,
  };

  const running = await expRepo.findRunningForNode(type, {
    channelId: assignmentContext.channelId,
    topicKey: assignmentContext.topicKey,
    sourceType: assignmentContext.sourceType,
  });

  const experimentAssignments: Record<string, ExperimentAssignmentMeta> = {};

  for (const exp of running) {
    const scope =
      exp.scope === "channel"
        ? "channel"
        : exp.scope === "topic"
          ? "topic"
          : exp.scope === "source_type"
            ? "source_type"
            : "global";

    const sv =
      scope === "channel"
        ? assignmentContext.channelId ?? null
        : scope === "topic"
          ? assignmentContext.topicKey ?? null
          : scope === "source_type"
            ? assignmentContext.sourceType ?? null
            : null;

    const bucket = computeBucket(
      ctx.jobId,
      exp.id,
      scope as import("./constants.js").Scope,
      sv,
      exp.numBuckets
    );

    const arms: ArmWithBuckets[] = exp.arms.map((a) => ({
      id: a.id,
      name: a.name,
      promptType: a.promptType,
      promptVersion: a.promptVersion,
      bucketStart: a.bucketStart,
      bucketEnd: a.bucketEnd,
    }));

    const arm = findArmForBucket(bucket, arms);
    if (arm && arm.promptType === type) {
      const pv = await db.promptVersion.findUnique({
        where: { type_version: { type: arm.promptType, version: arm.promptVersion } },
      });
      if (pv) {
        experimentAssignments[exp.id] = {
          armId: arm.id,
          armName: arm.name,
          nodeType: exp.nodeType,
          promptType: arm.promptType,
          promptVersion: arm.promptVersion,
        };
        const template = pv.content;
        const content = Object.entries(placeholders).reduce(
          (acc, [key, val]) => acc.replace(new RegExp(`{{${key}}}`, "g"), val),
          template
        );
        return {
          content,
          version: arm.promptVersion,
          experimentAssignments:
            Object.keys(experimentAssignments).length > 0 ? experimentAssignments : undefined,
        };
      }
    }
  }

  const active = await promptRepo.getActiveWithVersion(type);
  const template = active.content ?? DEFAULTS[type] ?? "";
  const content = Object.entries(placeholders).reduce(
    (acc, [key, val]) => acc.replace(new RegExp(`{{${key}}}`, "g"), val),
    template
  );
  return {
    content,
    version: active.version,
    experimentAssignments:
      Object.keys(experimentAssignments).length > 0 ? experimentAssignments : undefined,
  };
}
