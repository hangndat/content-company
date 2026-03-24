import type { PrismaClient } from "@prisma/client";
import { NODE_TYPES } from "../../experiments/constants.js";

const TREND_SOURCE = "trend_aggregate";

const MAX_PREVIEW = 240;
const MAX_DETAIL = 14_000;

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function asText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function normalizedPreview(items: unknown): string {
  if (!Array.isArray(items) || items.length === 0) return "—";
  const titles = items
    .slice(0, 4)
    .map((i) => (i && typeof i === "object" && "title" in i ? String((i as { title?: unknown }).title ?? "") : ""))
    .filter(Boolean);
  const extra = items.length > 4 ? ` (+${items.length - 4} mục)` : "";
  return titles.length ? `${titles.join(" · ")}${extra}` : `(${items.length} mục)`;
}

function promptVersionForStep(state: Record<string, unknown>, step: string): number | null {
  const pv = state.promptVersions;
  if (!pv || typeof pv !== "object") return null;
  const v = (pv as Record<string, unknown>)[step];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function ioForStep(step: string, state: Record<string, unknown>) {
  switch (step) {
    case "planner": {
      const input = normalizedPreview(state.normalizedItems);
      const output = asText(state.outline);
      return {
        inputPreview: clip(input, MAX_PREVIEW),
        outputPreview: clip(output, MAX_PREVIEW),
        inputDetail: clip(input, MAX_DETAIL),
        outputDetail: clip(output, MAX_DETAIL),
      };
    }
    case "scorer": {
      const input = asText(state.outline);
      const score = state.topicScore;
      const output =
        typeof score === "number" && Number.isFinite(score)
          ? `topicScore: ${score}`
          : asText(score);
      return {
        inputPreview: clip(input, MAX_PREVIEW),
        outputPreview: clip(output, MAX_PREVIEW),
        inputDetail: clip(input, MAX_DETAIL),
        outputDetail: clip(output, MAX_DETAIL),
      };
    }
    case "writer": {
      const input = asText(state.outline);
      const output = asText(state.draft);
      return {
        inputPreview: clip(input, MAX_PREVIEW),
        outputPreview: clip(output, MAX_PREVIEW),
        inputDetail: clip(input, MAX_DETAIL),
        outputDetail: clip(output, MAX_DETAIL),
      };
    }
    case "reviewer": {
      const input = asText(state.draft);
      const payload = {
        reviewScore: state.reviewScore ?? null,
        reviewNotes: state.reviewNotes ?? null,
        riskFlag: state.riskFlag ?? null,
      };
      const output = JSON.stringify(payload);
      return {
        inputPreview: clip(input, MAX_PREVIEW),
        outputPreview: clip(output, MAX_PREVIEW),
        inputDetail: clip(input, MAX_DETAIL),
        outputDetail: clip(output, MAX_DETAIL),
      };
    }
    default:
      return {
        inputPreview: "—",
        outputPreview: "—",
        inputDetail: "—",
        outputDetail: "—",
      };
  }
}

export type AgentIoFeedInput = {
  step: (typeof NODE_TYPES)[number];
  days?: number;
  limit?: number;
};

export type AgentIoFeedItem = {
  snapshotId: string;
  jobId: string;
  recordedAt: string;
  jobStatus: string;
  sourceType: string;
  promptVersion: number | null;
  inputPreview: string;
  outputPreview: string;
  inputDetail: string;
  outputDetail: string;
};

export async function getAgentIoFeed(db: PrismaClient, input: AgentIoFeedInput): Promise<{ items: AgentIoFeedItem[] }> {
  const days = Math.min(Math.max(input.days ?? 7, 1), 90);
  const limit = Math.min(Math.max(input.limit ?? 40, 1), 100);
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);

  const rows = await db.jobStateSnapshot.findMany({
    where: {
      step: input.step,
      createdAt: { gte: from },
      job: { sourceType: { not: TREND_SOURCE } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      jobId: true,
      createdAt: true,
      stateJson: true,
      job: { select: { status: true, sourceType: true } },
    },
  });

  const items: AgentIoFeedItem[] = rows.map((r) => {
    const state = (r.stateJson && typeof r.stateJson === "object" ? r.stateJson : {}) as Record<string, unknown>;
    const io = ioForStep(input.step, state);
    return {
      snapshotId: r.id,
      jobId: r.jobId,
      recordedAt: r.createdAt.toISOString(),
      jobStatus: r.job.status,
      sourceType: r.job.sourceType,
      promptVersion: promptVersionForStep(state, input.step),
      ...io,
    };
  });

  return { items };
}
