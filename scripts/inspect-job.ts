/**
 * Inspect a job's status and output (for debugging).
 * Usage: npm run inspect:job <jobId>
 * Or: npx tsx scripts/inspect-job.ts <jobId>
 */
import "dotenv/config";
import { loadEnv } from "../orchestrator/src/config/env.js";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL ?? "http://localhost:3000";

async function main() {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error("Usage: npm run inspect:job <jobId>");
    process.exit(1);
  }

  const env = loadEnv();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.API_KEY) {
    headers["Authorization"] = `Bearer ${env.API_KEY}`;
  }

  const res = await fetch(`${ORCHESTRATOR_URL}/v1/jobs/${jobId}`, { headers });
  const data = await res.json();

  if (!res.ok) {
    console.error("Error:", res.status, data);
    process.exit(1);
  }

  console.log("\n--- Job", jobId, "---");
  console.log("Status:", data.status);
  console.log("Decision:", data.decision ?? "—");
  console.log("Topic score:", data.scores?.topicScore ?? "—");
  console.log("Review score:", data.scores?.reviewScore ?? "—");
  console.log("Created:", data.createdAt);
  console.log("Completed:", data.completedAt ?? "—");

  if (data.output?.outline) {
    console.log("\n--- Outline ---");
    console.log(data.output.outline.slice(0, 300) + (data.output.outline.length > 300 ? "..." : ""));
  }
  if (data.output?.draft) {
    console.log("\n--- Draft (first 500 chars) ---");
    console.log(data.output.draft.slice(0, 500) + (data.output.draft.length > 500 ? "..." : ""));
  }
  if (data.output?.reviewNotes) {
    console.log("\n--- Review notes ---");
    console.log(data.output.reviewNotes);
  }

  if (data.status === "failed") {
    console.log("\n--- Debug tips ---");
    console.log("1. Check orchestrator terminal logs for 'Graph failed'");
    console.log("2. If USE_QUEUE=1, check worker logs");
    console.log("3. Verify OPENAI_API_KEY and network");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
