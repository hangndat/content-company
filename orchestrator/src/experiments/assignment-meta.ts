/**
 * Shape stored in JobOutput.experimentAssignments for debug/replay.
 * experimentId -> { armId, armName, nodeType, promptType, promptVersion }
 */
export type ExperimentAssignmentMeta = {
  armId: string;
  armName: string;
  nodeType: string;
  promptType: string;
  promptVersion: number;
};

/** Legacy: experimentId -> armId (string). New: experimentId -> ExperimentAssignmentMeta */
export type ExperimentAssignmentsValue = string | ExperimentAssignmentMeta;

export function parseArmIdFromAssignment(
  value: ExperimentAssignmentsValue | null | undefined
): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value.armId ?? null;
}
