import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(__dirname, "../../.env") });

const prisma = new PrismaClient();

const DEFAULT_PROMPTS = [
  {
    type: "planner",
    content: `Bạn là người lên kế hoạch nội dung. Dựa vào các mục nguồn, hãy rút ra chủ đề chính và tạo dàn ý ngắn gọn cho bài viết.

Nguồn dữ liệu (JSON):
{{SOURCE_ITEMS}}

Chỉ trả lời bằng JSON:
{
  "topic": "chủ đề chính trong một câu",
  "outline": "dàn ý bài viết dạng gạch đầu dòng, 3-5 điểm"
}`,
  },
  {
    type: "scorer",
    content: `Bạn là người đánh giá cơ hội nội dung. Chấm điểm mức độ đáng đăng nội dung về chủ đề này (0-1).

Chủ đề/Dàn ý:
{{OUTLINE}}

{{FEEDBACK_SECTION}}

Xem xét: tính liên quan, sự thú vị, tính độc đáo, giá trị cho người đọc.

Chỉ trả lời bằng JSON:
{
  "topicScore": 0.0 đến 1.0
}`,
  },
  {
    type: "writer",
    content: `Bạn là người viết nội dung. Viết bản nháp bài viết dựa trên dàn ý và nguồn tài liệu.

Dàn ý:
{{OUTLINE}}

Tóm tắt nguồn:
{{SOURCE_SUMMARY}}

Viết bài rõ ràng, giàu thông tin. 300-500 từ. Dùng định dạng markdown.`,
  },
  {
    type: "reviewer",
    content: `Bạn là người đánh giá chất lượng nội dung. Đánh giá bản nháp về: sự rõ ràng, logic, định dạng, không lặp lại, không spam/rủi ro.

Bản nháp:
{{DRAFT}}

Chỉ trả lời bằng JSON:
{
  "reviewScore": 0.0 đến 1.0,
  "reviewNotes": "ghi chú ngắn về chất lượng",
  "riskFlag": false
}`,
  },
];

async function main() {
  for (const p of DEFAULT_PROMPTS) {
    const existing = await prisma.promptVersion.findFirst({
      where: { type: p.type, isActive: true },
    });
    if (existing) {
      console.log(`Prompt ${p.type} already seeded`);
      continue;
    }

    const latest = await prisma.promptVersion.findFirst({
      where: { type: p.type },
      orderBy: { version: "desc" },
    });
    const version = (latest?.version ?? 0) + 1;

    await prisma.promptVersion.create({
      data: {
        type: p.type,
        version,
        content: p.content,
        isActive: true,
      },
    });
    console.log(`Created prompt ${p.type} v${version}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
