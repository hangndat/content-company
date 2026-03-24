/**
 * Trigger a content job (crawl + write flow).
 * Usage: npm run trigger:job
 * Requires: orchestrator running, .env with OPENAI_API_KEY, API_KEY
 */
import "dotenv/config";
import { randomUUID } from "crypto";
import { loadEnv } from "../orchestrator/src/config/env.js";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL ?? "http://localhost:3000";

async function main() {
  const env = loadEnv();

  const uniqueId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const body = {
    sourceType: "manual",
    rawItems: [
      {
        title: `Sample Topic: AI in Content Marketing (${uniqueId})`,
        body: "AI is transforming how brands create and distribute content. Machine learning models can now generate drafts, suggest headlines, and optimize for engagement.",
        url: `https://example.com/sample-article-${uniqueId}`,
      },
    ],
    publishPolicy: "review_only", // Safe default: requires manual approval
    channel: { id: "blog-1", type: "blog", metadata: {} },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (env.API_KEY) {
    headers["Authorization"] = `Bearer ${env.API_KEY}`;
  }

  console.log("Triggering job at", ORCHESTRATOR_URL + "/v1/jobs/content/run");
  const res = await fetch(ORCHESTRATOR_URL + "/v1/jobs/content/run", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Error:", res.status, data);
    process.exit(1);
  }

  console.log("Job created:", data.jobId);
  console.log("Status:", data.status);
  if (data.status === "review_required") {
    console.log("(Content written — awaiting manual approval. Approve: POST", ORCHESTRATOR_URL + "/v1/jobs/" + data.jobId + "/approve)");
  } else if (data.status === "failed") {
    console.log("(Job failed — check orchestrator logs)");
    console.log("  Inspect: npm run inspect:job", data.jobId);
  }
  console.log("Inspect: GET", ORCHESTRATOR_URL + "/v1/jobs/" + data.jobId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
