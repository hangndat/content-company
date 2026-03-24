import type { createJobRepo } from "../../repos/job.js";
import type { RunJobBody } from "../../api/schemas.js";
import { ERROR_CODES } from "./errors.js";

type JobRepo = ReturnType<typeof createJobRepo>;

export async function resolveRawItemsFromTrendJob(
  jobRepo: JobRepo,
  trendJobId: string,
  topicIndex?: number
): Promise<RunJobBody["rawItems"]> {
  const trendJob = await jobRepo.findById(trendJobId);
  if (!trendJob?.outputs?.trendCandidates) {
    throw Object.assign(new Error("Trend job not found or has no trendCandidates"), {
      code: ERROR_CODES.NOT_FOUND,
    });
  }
  const candidates = trendJob.outputs.trendCandidates as Array<{
    topic: string;
    aggregatedBody: string;
    itemRefs?: string[];
  }>;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw Object.assign(new Error("Trend job has no trendCandidates"), {
      code: ERROR_CODES.NOT_FOUND,
    });
  }
  if (topicIndex != null) {
    const idx = Math.min(topicIndex, candidates.length - 1);
    const c = candidates[idx]!;
    return [{ title: c.topic, body: c.aggregatedBody, url: c.itemRefs?.[0] }];
  }
  return candidates.map((c) => ({
    title: c.topic,
    body: c.aggregatedBody,
    url: c.itemRefs?.[0],
  }));
}
