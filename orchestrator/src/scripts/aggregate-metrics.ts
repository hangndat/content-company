import { loadEnv } from "../config/env.js";
import { createLogger } from "../lib/logger.js";
import { getPrisma } from "../db/client.js";
import { runAggregateMetrics } from "../jobs/aggregate-metrics.js";

async function main() {
  const env = loadEnv();
  const logger = createLogger(env.NODE_ENV);
  const db = getPrisma(logger);

  const days = parseInt(process.env.AGGREGATE_DAYS ?? "7", 10);
  const { aggregated } = await runAggregateMetrics(db, logger, { days });
  logger.info({ aggregated }, "Done");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
