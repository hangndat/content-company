import type { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import type { Env } from "../config/env.js";
import type { GraphState } from "../graph/types.js";
import { callAI } from "../lib/ai-client.js";
import { extractTopicIdentifiers } from "../lib/topic-key.js";
import { createDailyTopicMetricRepo } from "../repos/daily-topic-metric.js";
import { createJobRepo } from "../repos/job.js";
import { createJobSnapshotRepo } from "../repos/job-snapshot.js";

export type PromptDryRunType = "planner" | "scorer" | "writer" | "reviewer";

export class PromptDryRunError extends Error {
  readonly code: "NOT_FOUND" | "VALIDATION" | "SNAPSHOT_NOT_FOUND";

  constructor(code: PromptDryRunError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "PromptDryRunError";
  }
}

function parseSnapshotToState(json: Record<string, unknown>): GraphState {
  return {
    jobId: (json.jobId as string) ?? "dry-run",
    traceId: (json.traceId as string) ?? "",
    sourceType: (json.sourceType as string) ?? "manual",
    trendDomain: json.trendDomain as string | undefined,
    topicHint: json.topicHint as string | undefined,
    rawItems: (json.rawItems as GraphState["rawItems"]) ?? [],
    publishPolicy: (json.publishPolicy as string) ?? "review_only",
    channel: (json.channel as GraphState["channel"]) ?? { id: "dry-run", type: "blog" },
    normalizedItems: (json.normalizedItems as GraphState["normalizedItems"]) ?? [],
    outline: json.outline as string | undefined,
    topicScore: json.topicScore as number | undefined,
    draft: json.draft as string | undefined,
    reviewScore: json.reviewScore as number | undefined,
    reviewNotes: json.reviewNotes as string | undefined,
    riskFlag: json.riskFlag as boolean | undefined,
    decision: json.decision as string | undefined,
    retryCount: json.retryCount as number | undefined,
    promptVersions: json.promptVersions as GraphState["promptVersions"],
    experimentAssignments: json.experimentAssignments as GraphState["experimentAssignments"],
  };
}

function applyTemplate(template: string, placeholders: Record<string, string>): string {
  return Object.entries(placeholders).reduce(
    (acc, [key, val]) => acc.replace(new RegExp(`{{${key}}}`, "g"), val),
    template
  );
}

async function buildPlaceholders(
  promptType: PromptDryRunType,
  state: GraphState,
  db: PrismaClient
): Promise<Record<string, string>> {
  switch (promptType) {
    case "planner": {
      const items = state.normalizedItems ?? [];
      if (items.length === 0) {
        throw new PromptDryRunError(
          "VALIDATION",
          "Snapshot cần có normalizedItems (chọn bước sau normalize của job nội dung)."
        );
      }
      const sourceText = JSON.stringify(
        items.map((i) => ({ title: i.title, body: i.body.slice(0, 500) })),
        null,
        2
      );
      return { SOURCE_ITEMS: sourceText };
    }
    case "scorer": {
      const outline = state.outline ?? "";
      if (!outline) {
        throw new PromptDryRunError(
          "VALIDATION",
          "Snapshot cần có outline (chọn bước sau planner trở đi)."
        );
      }
      const { topicKey, topicSignature } = extractTopicIdentifiers(outline);
      let feedbackSection = "";
      if (topicKey || topicSignature) {
        const metricRepo = createDailyTopicMetricRepo(db);
        const feedback = await metricRepo.getHistoricalFeedback(topicKey, topicSignature, 30);
        feedbackSection = feedback.promptNote;
      }
      return { OUTLINE: outline, FEEDBACK_SECTION: feedbackSection };
    }
    case "writer": {
      const outline = state.outline ?? "";
      const items = state.normalizedItems ?? [];
      if (!outline || items.length === 0) {
        throw new PromptDryRunError(
          "VALIDATION",
          "Snapshot cần có outline và nguồn đã chuẩn hoá (thường là sau planner)."
        );
      }
      const sourceSummary = items
        .map((i) => `${i.title}: ${i.body.slice(0, 200)}...`)
        .join("\n\n");
      return { OUTLINE: outline, SOURCE_SUMMARY: sourceSummary };
    }
    case "reviewer": {
      const draft = state.draft ?? "";
      if (!draft) {
        throw new PromptDryRunError(
          "VALIDATION",
          "Snapshot cần có draft (chọn bước sau writer)."
        );
      }
      return { DRAFT: draft.slice(0, 2000) };
    }
  }
}

export async function runPromptDryRun(opts: {
  db: PrismaClient;
  logger: Logger;
  env: Env;
  promptType: PromptDryRunType;
  promptContent: string;
  sourceJobId: string;
  snapshotStep: string;
}): Promise<{ output: string; traceId: string }> {
  const jobRepo = createJobRepo(opts.db);
  const snapshotRepo = createJobSnapshotRepo(opts.db);

  const job = await jobRepo.findById(opts.sourceJobId);
  if (!job) {
    throw new PromptDryRunError("NOT_FOUND", "Không tìm thấy job.");
  }

  const snap = await snapshotRepo.getByStep(opts.sourceJobId, opts.snapshotStep);
  if (!snap?.stateJson || typeof snap.stateJson !== "object") {
    throw new PromptDryRunError(
      "SNAPSHOT_NOT_FOUND",
      `Không có snapshot cho bước "${opts.snapshotStep}" trên job này.`
    );
  }

  const state = parseSnapshotToState(snap.stateJson as Record<string, unknown>);
  const placeholders = await buildPlaceholders(opts.promptType, state, opts.db);
  const resolved = applyTemplate(opts.promptContent.trim(), placeholders);

  const traceId = `dry-run-${opts.sourceJobId.slice(0, 8)}-${Date.now()}`;
  const output = await callAI(resolved, { logger: opts.logger, env: opts.env }, {
    step: opts.promptType,
    jobId: opts.sourceJobId,
    traceId,
  });

  return { output, traceId };
}
