import type { PrismaClient } from "@prisma/client";
import {
  getPromptWithExperiments,
  type ResolverContext,
} from "../experiments/resolver.js";

import type { ExperimentAssignmentMeta } from "../experiments/assignment-meta.js";

export type PromptResult = {
  content: string;
  version: number;
  experimentAssignments?: Record<string, ExperimentAssignmentMeta>;
};

export type GetPromptOptions = {
  context?: ResolverContext;
};

/**
 * Resolves prompt: uses experiment arm if running experiment matches, else active prompt.
 * Pass context for experiment-aware resolution. Without context, falls back to active prompt.
 */
export async function getPrompt(
  db: PrismaClient,
  type: string,
  placeholders: Record<string, string>,
  options?: GetPromptOptions
): Promise<PromptResult> {
  if (options?.context) {
    return getPromptWithExperiments(db, type as "planner" | "scorer" | "writer" | "reviewer", placeholders, options.context);
  }

  const { createPromptVersionRepo } = await import("../repos/prompt-version.js");
  const repo = createPromptVersionRepo(db);
  const active = await repo.getActiveWithVersion(type);
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
  const template = active.content ?? DEFAULTS[type] ?? "";
  const content = Object.entries(placeholders).reduce(
    (acc, [key, val]) => acc.replace(new RegExp(`{{${key}}}`, "g"), val),
    template
  );
  return { content, version: active.version };
}
