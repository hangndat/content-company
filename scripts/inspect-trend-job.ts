/**
 * Inspect last trend job: rawItems, normalizedItems, trendCandidates, and why no trends.
 * Usage: npx tsx scripts/inspect-trend-job.ts [jobId]
 */
import "dotenv/config";
import { loadEnv } from "../orchestrator/src/config/env.js";
import { jaccardSimilarity } from "../orchestrator/src/lib/jaccard.js";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL ?? "http://localhost:3000";

function getSourceFromUrl(url?: string): string {
  if (!url) return "unknown";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("bongda24h")) return "bongda24h";
    if (host.includes("tinthethao")) return "tinthethao";
    if (host.includes("thethao247")) return "thethao247";
    if (host.includes("yeuthethao")) return "yeuthethao";
    if (host.includes("vnexpress")) return "vnexpress";
    if (host.includes("tuoitre")) return "tuoitre";
    if (host.includes("dantri")) return "dantri";
    if (host.includes("zingnews")) return "zingnews";
    if (host.includes("bongda.com")) return "bongda";
    if (host.includes("bongdaplus")) return "bongdaplus";
    if (host.includes("thanhnien")) return "thanhnien";
    if (host.includes("vietnamnet")) return "vietnamnet";
    if (host.includes("nld.com")) return "nld";
    return host.split(".")[0] ?? host;
  } catch {
    return "unknown";
  }
}

async function main() {
  const env = loadEnv();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.API_KEY) headers["Authorization"] = `Bearer ${env.API_KEY}`;

  let jobId = process.argv[2];
  if (!jobId) {
    // Get last trend job from list
    const listRes = await fetch(`${ORCHESTRATOR_URL}/v1/jobs?limit=50`, { headers });
    const list = await listRes.json();
    if (!listRes.ok) {
      console.error("List jobs failed:", listRes.status, list);
      process.exit(1);
    }
    const trendJobs = (list.items ?? []).filter((j: { sourceType: string }) => j.sourceType === "trend_aggregate");
    if (trendJobs.length === 0) {
      console.error("No trend jobs found.");
      process.exit(1);
    }
    jobId = trendJobs[0]!.id;
    console.log("Using last trend job:", jobId, "\n");
  }

  const detailRes = await fetch(`${ORCHESTRATOR_URL}/v1/jobs/${jobId}/detail`, { headers });
  const detail = await detailRes.json();
  if (!detailRes.ok) {
    console.error("Get detail failed:", detailRes.status, detail);
    process.exit(1);
  }

  const rawItems = detail.input?.rawPayload?.rawItems ?? [];
  const steps = detail.steps ?? [];
  const aggregateStep = steps.find((s: { step: string }) => s.step === "aggregate");
  const normalizeStep = steps.find((s: { step: string }) => s.step === "normalize");
  const normalizedItems = (aggregateStep?.stateJson ?? normalizeStep?.stateJson)?.normalizedItems ?? [];
  const trendCandidates = detail.job?.output?.trendCandidates ?? [];

  console.log("=== Input === ");
  console.log("rawItems count:", rawItems.length);
  const bySource = new Map<string, number>();
  for (const i of rawItems) {
    const s = getSourceFromUrl(i?.url);
    bySource.set(s, (bySource.get(s) ?? 0) + 1);
  }
  console.log("by source:", Object.fromEntries(bySource));
  console.log("");

  console.log("=== After Normalize ===");
  console.log("normalizedItems count:", normalizedItems.length);
  const normBySource = new Map<string, number>();
  for (const i of normalizedItems) {
    const s = getSourceFromUrl(i?.url);
    normBySource.set(s, (normBySource.get(s) ?? 0) + 1);
  }
  console.log("by source:", Object.fromEntries(normBySource));
  if (normalizedItems.length > 0) {
    console.log("\nSample titles (first 5):");
    normalizedItems.slice(0, 5).forEach((i: { title?: string; url?: string }, idx: number) => {
      console.log(`  ${idx + 1}. [${getSourceFromUrl(i.url)}] ${(i.title ?? "").slice(0, 70)}...`);
    });
  }
  console.log("");

  console.log("=== Trend Candidates ===");
  console.log("count:", trendCandidates.length);
  trendCandidates.forEach((c: { topic?: string; sourceCount?: number }, i: number) => {
    console.log(`  [${i}] ${c.topic} (${c.sourceCount} sources)`);
  });
  console.log("");

  if (normalizedItems.length > 0 && trendCandidates.length === 0) {
    console.log("=== Why no trends? (Jaccard analysis) ===");
    console.log("Trends need: Jaccard(title1, title2) >= 0.4 AND from >= 2 sources\n");
    const itemsWithSource = normalizedItems.map((i: { title?: string; url?: string }) => ({
      title: i.title ?? "",
      source: getSourceFromUrl(i.url),
    }));
    let bestSim = 0;
    let bestPair: [string, string, string, string, number] | null = null;
    for (let i = 0; i < itemsWithSource.length; i++) {
      for (let j = i + 1; j < itemsWithSource.length; j++) {
        const a = itemsWithSource[i]!;
        const b = itemsWithSource[j]!;
        const sim = jaccardSimilarity(a.title, b.title);
        if (sim > bestSim) {
          bestSim = sim;
          bestPair = [a.title, a.source, b.title, b.source, sim];
        }
      }
    }
    if (bestPair) {
      const [t1, s1, t2, s2, sim] = bestPair;
      console.log("Best matching pair (cross-source):");
      console.log(`  [${s1}] ${t1.slice(0, 60)}...`);
      console.log(`  [${s2}] ${t2.slice(0, 60)}...`);
      console.log(`  Jaccard: ${sim.toFixed(3)} (need >= 0.4)`);
      if (s1 === s2) console.log("  -> Same source! Need 2+ sources for trend.");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
