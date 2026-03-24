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

/**
 * Trùng khớp RSS trong `n8n/workflows/A-trend-ingest.json` (rssFeedRead.url + name).
 * `trendDomain: sports-vn` giống body workflow gọi `POST /v1/jobs/trend/run`.
 */
const SEED_TREND_RSS_SOURCES: Array<{
  trendDomain: string;
  label: string;
  feedUrl: string;
  enabled: boolean;
}> = [
  { trendDomain: "sports-vn", label: "RSS vnexpress-thethao", feedUrl: "https://vnexpress.net/rss/the-thao.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS tuoitre-thethao", feedUrl: "https://tuoitre.vn/rss/the-thao.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS dantri-thethao", feedUrl: "https://dantri.com.vn/rss/the-thao.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS zingnews-thethao", feedUrl: "https://zingnews.vn/rss/the-thao.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS bongda-feed", feedUrl: "https://bongda.com.vn/feed.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS bongda-vietnam", feedUrl: "https://bongda.com.vn/viet-nam.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS bongda-vleague", feedUrl: "https://bongda.com.vn/v-league.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS bongda-chuyennhuong", feedUrl: "https://bongda.com.vn/tin-chuyen-nhuong.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS bongda-c1", feedUrl: "https://bongda.com.vn/champions-league.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS bongda-anh", feedUrl: "https://bongda.com.vn/bong-da-anh.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS bongda-aff", feedUrl: "https://bongda.com.vn/aff-cup.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS bongda-worldcup", feedUrl: "https://bongda.com.vn/world-cup.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS thanhnien-thethao", feedUrl: "https://thanhnien.vn/rss/the-thao.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS vietnamnet-thethao", feedUrl: "https://vietnamnet.vn/rss/the-thao.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS nld-thethao", feedUrl: "https://nld.com.vn/rss/the-thao.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS bongda24h-1", feedUrl: "https://bongda24h.vn/RSS/1.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS bongda24h-168", feedUrl: "https://bongda24h.vn/RSS/168.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS tinthethao-feed", feedUrl: "https://www.tinthethao.com.vn/feed.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS tinthethao-bongda", feedUrl: "https://www.tinthethao.com.vn/bong-da.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS thethao247-24h", feedUrl: "https://thethao247.vn/the-thao-24h.rss", enabled: true },
  { trendDomain: "sports-vn", label: "RSS thethao247-bongda", feedUrl: "https://thethao247.vn/bong-da.rss", enabled: true },
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

  for (const s of SEED_TREND_RSS_SOURCES) {
    const existing = await prisma.trendContentSource.findFirst({
      where: { feedUrl: s.feedUrl },
    });
    if (existing) {
      console.log(`Trend RSS source already exists: ${s.label}`);
      continue;
    }
    await prisma.trendContentSource.create({
      data: {
        trendDomain: s.trendDomain,
        kind: "rss",
        label: s.label,
        feedUrl: s.feedUrl,
        enabled: s.enabled,
      },
    });
    console.log(`Created trend RSS source: ${s.label}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
