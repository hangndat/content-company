import { createHash } from "node:crypto";

/** Stable fingerprint for cross-job trend/topic dedup (domain + normalized title). */
export function trendTopicFingerprint(trendDomain: string, topic: string): string {
  const norm = topic.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(`${trendDomain}::${norm}`).digest("hex");
}
