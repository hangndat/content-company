import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import { registerHealthRoutes } from "./health.js";

describe("registerHealthRoutes", () => {
  let app: Awaited<ReturnType<typeof Fastify>>;

  beforeEach(async () => {
    const redis = { ping: vi.fn().mockResolvedValue("PONG") };
    const db = { $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]) };
    app = Fastify({ logger: false });
    await registerHealthRoutes(app as never, {
      redis: redis as never,
      db: db as never,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET /health returns ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: "ok" });
  });

  it("GET /ready returns 200 when db and redis succeed", async () => {
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ready: true });
  });
});
