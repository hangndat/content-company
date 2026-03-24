import type { Scope } from "./constants.js";

export type AssignmentContext = {
  jobId: string;
  channelId?: string;
  topicKey?: string;
  sourceType?: string;
};

export type ArmWithBuckets = {
  id: string;
  name: string;
  promptType: string;
  promptVersion: number;
  bucketStart: number;
  bucketEnd: number;
};

/**
 * Deterministic hash: same inputs → same bucket.
 * Uses djb2-like hash for consistency.
 */
function hashToBucket(str: string, numBuckets: number): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return Math.abs(h) % numBuckets;
}

export function computeBucket(
  jobId: string,
  experimentId: string,
  scope: Scope,
  scopeValue: string | null,
  numBuckets: number
): number {
  const scopePart = scopeValue ?? "";
  const input = `${jobId}:${experimentId}:${scope}:${scopePart}`;
  return hashToBucket(input, numBuckets);
}

export function findArmForBucket(
  bucket: number,
  arms: ArmWithBuckets[]
): ArmWithBuckets | null {
  for (const arm of arms) {
    if (bucket >= arm.bucketStart && bucket <= arm.bucketEnd) {
      return arm;
    }
  }
  return null;
}
