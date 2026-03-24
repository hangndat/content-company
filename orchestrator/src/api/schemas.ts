import { z } from "zod";

export const rawItemSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  body: z.string().default(""),
  url: z.string().url().optional(),
  publishedAt: z.string().datetime().optional(),
});

export const channelSchema = z.object({
  id: z.string(),
  type: z.enum(["blog", "social", "affiliate"]),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const runJobBodySchema = z.object({
  jobId: z.string().uuid().optional(),
  traceId: z.string().uuid().optional(),
  sourceType: z.enum(["rss", "webhook", "manual", "api"]),
  topicHint: z.string().optional(),
  rawItems: z.array(rawItemSchema),
  publishPolicy: z.enum(["auto", "review_only", "manual_only"]),
  channel: channelSchema,
});

export const approveBodySchema = z.object({
  actor: z.string(),
  reason: z.string().optional(),
});

export const rejectBodySchema = z.object({
  actor: z.string(),
  reason: z.string().min(1),
});

export const replayBodySchema = z.object({
  fromStep: z.enum(["normalize", "planner", "scorer", "writer", "reviewer", "decision"]).optional(),
});

export type RunJobBody = z.infer<typeof runJobBodySchema>;
export type ApproveBody = z.infer<typeof approveBodySchema>;
export type RejectBody = z.infer<typeof rejectBodySchema>;
