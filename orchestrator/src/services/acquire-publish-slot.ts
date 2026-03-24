import type { createJobRepo } from "../repos/job.js";
import type { createPublishedRepo } from "../repos/published.js";
import type { createPublishDedupe } from "../redis/publish-dedupe.js";
import type { createPublishRateLimit } from "../redis/publish-rate.js";

type JobRepo = ReturnType<typeof createJobRepo>;
type PublishedRepo = ReturnType<typeof createPublishedRepo>;
type PublishDedupe = ReturnType<typeof createPublishDedupe>;
type PublishRate = ReturnType<typeof createPublishRateLimit>;

export type AcquirePublishSlotDeps = {
  jobRepo: JobRepo;
  publishedRepo: PublishedRepo;
  publishDedupe: PublishDedupe;
  publishRate: PublishRate;
};

export type AcquirePublishSlotInput = {
  jobId: string;
  bodyChannelId?: string;
  channelType?: string;
};

export type AcquirePublishSlotOutcome =
  | { kind: "not_found" }
  | { kind: "not_approved" }
  | { kind: "no_draft" }
  | { kind: "duplicate_content" }
  | { kind: "rate_limit"; current: number; limit: number }
  | { kind: "already_published" }
  | { kind: "ok"; contentHash: string };

export async function evaluateAcquirePublishSlot(
  input: AcquirePublishSlotInput,
  deps: AcquirePublishSlotDeps
): Promise<AcquirePublishSlotOutcome> {
  const { jobId, bodyChannelId, channelType } = input;
  const job = await deps.jobRepo.findById(jobId);

  if (!job) {
    return { kind: "not_found" };
  }

  const norm = job.inputs?.normalizedPayload as { channel?: { id?: string; type?: string } } | undefined;
  const channelId = bodyChannelId ?? norm?.channel?.id ?? "default";

  if (job.decision !== "APPROVED") {
    return { kind: "not_approved" };
  }

  const draft = job.outputs?.draft ?? "";
  if (!draft) {
    return { kind: "no_draft" };
  }

  const contentHash = deps.publishDedupe.hashContent(draft);

  if (await deps.publishDedupe.isDuplicate(channelId, contentHash)) {
    return { kind: "duplicate_content" };
  }

  const chType = channelType ?? norm?.channel?.type ?? "default";
  const { current, limit } = await deps.publishRate.check(channelId, chType);

  if (current >= limit) {
    return { kind: "rate_limit", current, limit };
  }

  const alreadyPublished = await deps.publishedRepo.hasPublishedForJob(jobId);
  if (alreadyPublished) {
    return { kind: "already_published" };
  }

  await deps.publishRate.incr(channelId);
  await deps.publishDedupe.markPublished(channelId, contentHash);

  return { kind: "ok", contentHash };
}
