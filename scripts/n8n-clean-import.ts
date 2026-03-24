/**
 * Clean all n8n workflows via API, then import from n8n/workflows/.
 * Usage: npm run n8n:import
 * Requires: n8n running (docker compose up -d n8n)
 * Optional: N8N_API_KEY in .env when n8n has API auth enabled
 */
import "dotenv/config";
import { execSync } from "child_process";

const N8N_URL = process.env.N8N_URL ?? "http://localhost:5678";
const N8N_API_KEY = process.env.N8N_API_KEY;

async function listAllWorkflows(): Promise<{ id: string; name: string }[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (N8N_API_KEY) {
    headers["X-N8N-API-KEY"] = N8N_API_KEY;
  }
  const res = await fetch(`${N8N_URL}/api/v1/workflows?limit=250`, {
    method: "GET",
    headers,
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("n8n API auth failed. Set N8N_API_KEY in .env (n8n Settings → API).");
    }
    throw new Error(`n8n list workflows failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as
    | { data?: { id: string; name: string }[] }
    | { workflows?: { id: string; name: string }[] };
  const list = data.data ?? (data as { workflows?: { id: string; name: string }[] }).workflows ?? [];
  return Array.isArray(list) ? list : [];
}

async function deleteWorkflow(id: string): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (N8N_API_KEY) {
    headers["X-N8N-API-KEY"] = N8N_API_KEY;
  }
  const res = await fetch(`${N8N_URL}/api/v1/workflows/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok && res.status !== 404) {
    console.warn(`  delete ${id} failed: ${res.status}`);
  }
}

async function main() {
  console.log("n8n clean + import\n");

  // 1. Clean: delete all workflows via API
  try {
    const workflows = await listAllWorkflows();
    if (workflows.length === 0) {
      console.log("No workflows to clean.");
    } else {
      console.log(`Cleaning ${workflows.length} workflow(s)...`);
      for (const w of workflows) {
        await deleteWorkflow(w.id);
        console.log(`  deleted: ${w.name}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) {
      console.error("Cannot reach n8n at", N8N_URL);
      console.error("Start n8n: docker compose up -d n8n");
      process.exit(1);
    }
    throw err;
  }

  // 2. Import via docker exec
  console.log("\nImporting workflows...");
  execSync("docker compose exec n8n n8n import:workflow --separate --input=/workflows", {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
