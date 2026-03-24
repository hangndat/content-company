import { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";

let prisma: PrismaClient | null = null;

export function getPrisma(logger?: Logger): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: logger
        ? [
            { emit: "event", level: "query" },
            { emit: "event", level: "error" },
          ]
        : undefined,
    });
    if (logger) {
      prisma.$on("query" as never, (e: { query: string }) => {
        logger.debug({ query: e.query }, "Prisma query");
      });
      prisma.$on("error" as never, (e: { message: string }) => {
        logger.error({ err: e.message }, "Prisma error");
      });
    }
  }
  return prisma;
}
