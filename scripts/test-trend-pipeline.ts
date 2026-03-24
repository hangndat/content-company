/**
 * Test Trend Job + Content Job pipeline.
 * Usage: npx tsx scripts/test-trend-pipeline.ts
 *        npx tsx scripts/test-trend-pipeline.ts --source-id-only
 * Requires: orchestrator running on port 3000
 */
import "dotenv/config";
import { loadEnv } from "../orchestrator/src/config/env.js";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL ?? "http://localhost:3000";

async function runMainPipeline(headers: Record<string, string>) {
  const rawItems = [
    {
      title: "Haaland chính thức gia hạn hợp đồng với Man City đến 2029",
      body: "Tiền đạo người Na Uy đã ký bản hợp đồng mới với đội bóng thành Manchester. Đây là tin vui lớn cho người hâm mộ Man City.",
      url: "https://bongda24h.vn/tin-1.html",
    },
    {
      title: "Haaland chính thức gia hạn hợp đồng với Man City đến 2029",
      body: "Erling Haaland tiếp tục gắn bó với Manchester City sau khi ký gia hạn. Anh sẽ cống hiến cho đội bóng đến mùa giải 2028-2029.",
      url: "https://www.tinthethao.com.vn/tin-2.html",
    },
    {
      title: "Pep Guardiola hài lòng sau khi Haaland gia hạn",
      body: "HLV Pep Guardiola bày tỏ sự hài lòng khi tiền đạo chủ lực Haaland quyết định gia hạn hợp đồng với Man City.",
      url: "https://thethao247.vn/tin-3.html",
    },
    {
      title: "Lịch thi đấu V-League vòng 15 hôm nay",
      body: "Các trận đấu vòng 15 V-League 2024 sẽ diễn ra vào chiều nay với nhiều cặp đấu hấp dẫn.",
      url: "https://bongda24h.vn/lich-vleague.html",
    },
    {
      title: "V-League 2024: Lịch các trận đấu vòng 15",
      body: "Vòng 15 V-League 2024 khởi tranh với các cặp đấu: Hà Nội vs Bình Dương, Viettel vs HAGL...",
      url: "https://www.tinthethao.com.vn/lich-vleague.html",
    },
  ];

  console.log("=== 1. POST /v1/jobs/trend/run ===");
  const trendRes = await fetch(ORCHESTRATOR_URL + "/v1/jobs/trend/run", {
    method: "POST",
    headers,
    body: JSON.stringify({ domain: "sports-vn", rawItems }),
  });
  const trendData = await trendRes.json();
  if (!trendRes.ok) {
    console.error("Trend job failed:", trendRes.status, trendData);
    process.exit(1);
  }
  console.log("Trend job:", trendData.jobId, "status:", trendData.status);

  console.log("\n=== 2. GET /v1/jobs/:jobId ===");
  const getRes = await fetch(ORCHESTRATOR_URL + "/v1/jobs/" + trendData.jobId, { headers });
  const jobData = await getRes.json();
  if (!getRes.ok) {
    console.error("Get job failed:", getRes.status, jobData);
    process.exit(1);
  }
  const candidates = jobData.output?.trendCandidates ?? [];
  console.log("trendCandidates count:", candidates.length);
  candidates.forEach((c: { topic?: string; sourceCount?: number }, i: number) => {
    console.log(`  [${i}] ${c.topic} (${c.sourceCount} sources)`);
  });

  if (candidates.length === 0) {
    console.log("\nNo trend candidates - skipping content job test.");
    return;
  }

  console.log("\n=== 3. POST /v1/jobs/content/run (trendJobId + topicIndex=0) ===");
  const contentRes = await fetch(ORCHESTRATOR_URL + "/v1/jobs/content/run", {
    method: "POST",
    headers,
    body: JSON.stringify({
      sourceType: "trend",
      trendJobId: trendData.jobId,
      topicIndex: 0,
      publishPolicy: "review_only",
      channel: { id: "blog-1", type: "blog", metadata: {} },
    }),
  });
  const contentData = await contentRes.json();
  if (!contentRes.ok) {
    console.error("Content job failed:", contentRes.status, contentData);
    process.exit(1);
  }
  console.log("Content job:", contentData.jobId, "status:", contentData.status);

  console.log("\n=== 4. GET /v1/jobs/:jobId/detail (content job) ===");
  const detailRes = await fetch(ORCHESTRATOR_URL + "/v1/jobs/" + contentData.jobId + "/detail", {
    headers,
  });
  const detail = await detailRes.json();
  if (detailRes.ok && detail.job?.output?.outline) {
    console.log("Outline:", detail.job.output.outline.slice(0, 200) + "...");
  }
  if (detailRes.ok && detail.job?.output?.draft) {
    console.log("Draft length:", detail.job.output.draft.length, "chars");
  }

  console.log("\n=== Main pipeline done ===");
}

async function testSourceIdOnlyBranch(headers: Record<string, string>) {
  console.log("\n=== Extra: trend with sourceId-only items (no url) ===");
  const rawItems = [
    {
      title: "ĐT Việt Nam tập trung chuẩn bị vòng loại",
      body: "Đội tuyển quốc gia hội quân tại Hà Nội với đầy đủ cầu thủ trong nước và hải ngoại cho đợt tập trung sắp tới.",
      sourceId: "telegram-sports-a",
    },
    {
      title: "Đội tuyển Việt Nam hội quân đông đủ quân số",
      body: "HLV trưởng đánh giá cao tinh thần các cầu thủ trong buổi tập đầu tiên tại trung tâm đào tạo.",
      sourceId: "telegram-sports-b",
    },
  ];
  const res = await fetch(ORCHESTRATOR_URL + "/v1/jobs/trend/run", {
    method: "POST",
    headers,
    body: JSON.stringify({ domain: "sports-vn", rawItems }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("sourceId-only trend failed:", res.status, data);
    process.exit(1);
  }
  const getRes = await fetch(ORCHESTRATOR_URL + "/v1/jobs/" + data.jobId, { headers });
  const job = await getRes.json();
  const n = job.output?.trendCandidates?.length ?? 0;
  console.log("sourceId-only job:", data.jobId, "candidates:", n);
}

async function main() {
  const env = loadEnv();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.API_KEY) headers["Authorization"] = `Bearer ${env.API_KEY}`;

  const argv = new Set(process.argv.slice(2));
  if (argv.has("--source-id-only")) {
    await testSourceIdOnlyBranch(headers);
    return;
  }

  await runMainPipeline(headers);
  await testSourceIdOnlyBranch(headers);
  console.log("\n=== All done ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
