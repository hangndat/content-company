import type { PrismaClient } from "@prisma/client";
import type { TrendCandidate } from "../trends/trend-candidate.js";
import { trendTopicFingerprint } from "../trends/topic-fingerprint.js";

export async function syncTrendTopicObservations(
  db: PrismaClient,
  input: {
    sourceJobId: string;
    trendDomain: string;
    candidates: TrendCandidate[];
  }
): Promise<void> {
  const { sourceJobId, trendDomain, candidates } = input;
  await db.trendTopicObservation.deleteMany({ where: { sourceJobId } });
  if (candidates.length === 0) return;
  await db.trendTopicObservation.createMany({
    data: candidates.map((c, candidateIndex) => ({
      fingerprint: trendTopicFingerprint(trendDomain, c.topic),
      trendDomain,
      sourceJobId,
      candidateIndex,
      topicTitle: c.topic.slice(0, 512),
    })),
  });
}
