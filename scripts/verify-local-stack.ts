/**
 * Verify Postgres + Redis (and optionally orchestrator HTTP) after `docker compose up -d`.
 *
 * Usage:
 *   npx tsx scripts/verify-local-stack.ts
 *   CHECK_ORCHESTRATOR=1 npx tsx scripts/verify-local-stack.ts
 *
 * Does not call loadEnv() — avoids requiring OPENAI_API_KEY for infra-only checks.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL ?? "http://127.0.0.1:3000";
const CHECK_ORCHESTRATOR =
  process.env.CHECK_ORCHESTRATOR === "1" || process.env.CHECK_ORCHESTRATOR === "true";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is not set (copy .env.example → .env)");
    process.exit(1);
  }
  if (!redisUrl) {
    console.error("REDIS_URL is not set");
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log("OK  Postgres:", databaseUrl.replace(/:[^:@]+@/, ":****@"));
  } catch (e) {
    console.error("FAIL Postgres:", e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
  try {
    await redis.connect();
    const pong = await redis.ping();
    if (pong !== "PONG") {
      throw new Error(`unexpected PING reply: ${pong}`);
    }
    console.log("OK  Redis:", redisUrl.replace(/:[^:@]*@/, ":****@"));
  } catch (e) {
    console.error("FAIL Redis:", e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    redis.disconnect();
  }

  if (CHECK_ORCHESTRATOR) {
    for (const path of ["/health", "/ready"]) {
      const url = `${ORCHESTRATOR_URL.replace(/\/$/, "")}${path}`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const text = await res.text();
        if (!res.ok) {
          console.error(`FAIL  ${path} ${res.status}: ${text.slice(0, 200)}`);
          process.exit(1);
        }
        console.log(`OK  GET ${path} → ${res.status}`);
      } catch (e) {
        console.error(
          `FAIL  GET ${path} (${url}):`,
          e instanceof Error ? e.message : e,
          "\nStart API: npm run dev"
        );
        process.exit(1);
      }
    }
  } else {
    console.log("Skip orchestrator (set CHECK_ORCHESTRATOR=1 to probe /health and /ready)");
  }

  console.log("\nAll checks passed.");
}

main();
