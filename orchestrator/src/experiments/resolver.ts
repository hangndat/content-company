import type { PrismaClient } from "@prisma/client";
import { createPromptVersionRepo } from "../repos/prompt-version.js";
import { createExperimentRepo } from "../repos/experiment.js";
import {
  computeBucket,
  findArmForBucket,
  type AssignmentContext,
  type ArmWithBuckets,
} from "./assignment.js";
import type { NodeType } from "./constants.js";

const DEFAULTS: Record<string, string> = {
  planner: `Bạn là người lên kế hoạch nội dung. Dựa vào các mục nguồn, hãy rút ra chủ đề chính và tạo dàn ý ngắn gọn cho bài viết.

Nguồn dữ liệu (JSON):
{{SOURCE_ITEMS}}

Chỉ trả lời bằng JSON:
{
  "topic": "chủ đề chính trong một câu",
  "outline": "dàn ý bài viết dạng gạch đầu dòng, 3-5 điểm"
}`,
  scorer: `Bạn là người đánh giá cơ hội nội dung. Chấm điểm mức độ đáng đăng nội dung về chủ đề này (0-1).

Chủ đề/Dàn ý:
{{OUTLINE}}

{{FEEDBACK_SECTION}}

Xem xét: tính liên quan, sự thú vị, tính độc đáo, giá trị cho người đọc.

Chỉ trả lời bằng JSON:
{
  "topicScore": 0.0 đến 1.0
}`,
  writer: `Bạn là người viết nội dung. Viết bản nháp bài viết dựa trên dàn ý và nguồn tài liệu.

Dàn ý:
{{OUTLINE}}

Tóm tắt nguồn:
{{SOURCE_SUMMARY}}

Viết bài rõ ràng, giàu thông tin. 300-500 từ. Dùng định dạng markdown.`,
  reviewer: `Bạn là người đánh giá chất lượng nội dung. Đánh giá bản nháp về: sự rõ ràng, logic, định dạng, không lặp lại, không spam/rủi ro.

Bản nháp:
{{DRAFT}}

Chỉ trả lời bằng JSON:
{
  "reviewScore": 0.0 đến 1.0,
  "reviewNotes": "ghi chú ngắn về chất lượng",
  "riskFlag": false
}`,
};

import type { ExperimentAssignmentMeta } from "./assignment-meta.js";

export type { ExperimentAssignmentMeta };

export type PromptResult = {
  content: string;
  version: number;
  experimentAssignments?: Record<string, ExperimentAssignmentMeta>;
};

export type ResolverContext = {
  jobId: string;
  channel?: { id?: string; type?: string };
  topicKey?: string;
  sourceType?: string;
};

export async function getPromptWithExperiments(
  db: PrismaClient,
  type: NodeType,
  placeholders: Record<string, string>,
  ctx: ResolverContext
): Promise<PromptResult> {
  const expRepo = createExperimentRepo(db);
  const promptRepo = createPromptVersionRepo(db);

  const assignmentContext: AssignmentContext = {
    jobId: ctx.jobId,
    channelId: ctx.channel?.id,
    topicKey: ctx.topicKey,
    sourceType: ctx.sourceType,
  };

  const running = await expRepo.findRunningForNode(type, {
    channelId: assignmentContext.channelId,
    topicKey: assignmentContext.topicKey,
    sourceType: assignmentContext.sourceType,
  });

  const experimentAssignments: Record<string, ExperimentAssignmentMeta> = {};

  for (const exp of running) {
    const scope =
      exp.scope === "channel"
        ? "channel"
        : exp.scope === "topic"
          ? "topic"
          : exp.scope === "source_type"
            ? "source_type"
            : "global";

    const sv =
      scope === "channel"
        ? assignmentContext.channelId ?? null
        : scope === "topic"
          ? assignmentContext.topicKey ?? null
          : scope === "source_type"
            ? assignmentContext.sourceType ?? null
            : null;

    const bucket = computeBucket(
      ctx.jobId,
      exp.id,
      scope as import("./constants.js").Scope,
      sv,
      exp.numBuckets
    );

    const arms: ArmWithBuckets[] = exp.arms.map((a) => ({
      id: a.id,
      name: a.name,
      promptType: a.promptType,
      promptVersion: a.promptVersion,
      bucketStart: a.bucketStart,
      bucketEnd: a.bucketEnd,
    }));

    const arm = findArmForBucket(bucket, arms);
    if (arm && arm.promptType === type) {
      const pv = await db.promptVersion.findUnique({
        where: { type_version: { type: arm.promptType, version: arm.promptVersion } },
      });
      if (pv) {
        experimentAssignments[exp.id] = {
          armId: arm.id,
          armName: arm.name,
          nodeType: exp.nodeType,
          promptType: arm.promptType,
          promptVersion: arm.promptVersion,
        };
        const template = pv.content;
        const content = Object.entries(placeholders).reduce(
          (acc, [key, val]) => acc.replace(new RegExp(`{{${key}}}`, "g"), val),
          template
        );
        return {
          content,
          version: arm.promptVersion,
          experimentAssignments:
            Object.keys(experimentAssignments).length > 0 ? experimentAssignments : undefined,
        };
      }
    }
  }

  const active = await promptRepo.getActiveWithVersion(type);
  const template = active.content ?? DEFAULTS[type] ?? "";
  const content = Object.entries(placeholders).reduce(
    (acc, [key, val]) => acc.replace(new RegExp(`{{${key}}}`, "g"), val),
    template
  );
  return {
    content,
    version: active.version,
    experimentAssignments:
      Object.keys(experimentAssignments).length > 0 ? experimentAssignments : undefined,
  };
}
