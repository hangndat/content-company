import type { GraphState } from "./types.js";

/** Restore fields persisted in content graph snapshots when resuming from `fromStep`. */
export function hydrateContentStateFromSnapshot(
  base: GraphState,
  snapped: Record<string, unknown>
): GraphState {
  return {
    ...base,
    topicHint: (snapped.topicHint as string) ?? base.topicHint,
    normalizedItems:
      (snapped.normalizedItems as GraphState["normalizedItems"]) ?? base.normalizedItems,
    outline: (snapped.outline as string) ?? base.outline,
    topicScore: (snapped.topicScore as number) ?? base.topicScore,
    draft: (snapped.draft as string) ?? base.draft,
    reviewScore: (snapped.reviewScore as number) ?? base.reviewScore,
    reviewNotes: (snapped.reviewNotes as string) ?? base.reviewNotes,
    riskFlag: (snapped.riskFlag as boolean) ?? base.riskFlag,
    decision: (snapped.decision as string) ?? base.decision,
    promptVersions: (snapped.promptVersions as GraphState["promptVersions"]) ?? base.promptVersions,
    experimentAssignments:
      (snapped.experimentAssignments as GraphState["experimentAssignments"]) ??
      base.experimentAssignments,
  };
}
