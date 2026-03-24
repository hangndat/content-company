---
name: content-company
description: >-
  Hybrid AI content automation monorepo — documents this repo's tech stack and
  libraries (Fastify, BullMQ, Prisma/PostgreSQL, ioredis, OpenAI SDK, Langfuse,
  Zod, Pino; admin: Vite, React, Ant Design; n8n JSON). Use when choosing APIs,
  adding dependencies, or editing orchestrator lib/, graph nodes, admin UI, or
  workflows in this project.
---

# content-company

## Tech stack (repo root)

| Layer | Choice | npm package / notes |
|-------|--------|---------------------|
| Runtime | Node, ESM | `type: "module"`; dev/run via **tsx** |
| Language | TypeScript 5.6 | `tsc -p orchestrator/tsconfig.json` for orchestrator build |
| HTTP API | Fastify 5 | `@fastify/cors`; routes under `orchestrator/src/api/` |
| Validation / env | Zod 3 | `orchestrator/src/config/env.ts`, `api/schemas.ts` |
| DB | PostgreSQL | **Prisma 6** (`orchestrator/prisma/`, `@prisma/client`) |
| Queue / jobs | Redis | **BullMQ 5** + **ioredis 5** (`orchestrator/src/redis/`, worker) |
| Logging | Pino | `pino`, `pino-pretty` (dev) |
| LLM | OpenAI | `openai` v4; wrapped in `orchestrator/src/lib/ai-client.ts` |
| LLM observability | Langfuse | `langfuse` (`observeOpenAI`, flush helpers in `lib/`) |
| Config load | dotenv | root `.env` |
| Tests | Vitest 2 | `*.test.ts` next to sources |
| Automation (external) | n8n | workflow exports in `n8n/workflows/*.json` |

Dependencies live in the **root** `package.json` (orchestrator is not a separate npm package). Admin is a **second** npm app under `admin/package.json`.

## Admin stack (`admin/`)

| Layer | npm packages |
|-------|----------------|
| Bundler | Vite 5, `@vitejs/plugin-react` |
| UI | React 18, **antd** 5, **@ant-design/pro-components**, **@ant-design/icons**, **@ant-design/charts** |
| Routing | `react-router-dom` 6 |

## Orchestrator: where libraries are used

| Concern | Typical paths |
|---------|----------------|
| OpenAI + Langfuse instrumentation | `orchestrator/src/lib/ai-client.ts`, `openai-langfuse-flush.ts` |
| Embeddings / trend helpers | `orchestrator/src/lib/trend-embeddings.ts` |
| Redis client, dedupe, rate limits | `orchestrator/src/redis/` |
| Job pipeline (“graph”) steps | `orchestrator/src/graph/` (custom step runner + `nodes/`, not `@langchain/langgraph`) |
| Persistence | `orchestrator/src/repos/`, Prisma schema `orchestrator/prisma/schema.prisma` |
| Domain logic | `orchestrator/src/services/`, `trends/` |

## Layout

| Path | Role |
|------|------|
| `orchestrator/src/` | API (`index.ts`), worker (`worker/`), graph (`graph/`), `services/job.ts` (facade) + `services/job-service/`, repos, `lib/`, `config/env.ts` |
| `orchestrator/src/dashboard/queries/` | SQL/report helpers for `api/routes/dashboard.ts` |
| `orchestrator/prisma/` | Schema, migrations, `seed.ts` |
| `admin/src/` | Vite app; shell in `app/` (`App.tsx`, `opsLazyRoutes.tsx`), HTTP client in `lib/api.ts`, feature code under `features/ops/`, shared under `shared/`; import alias `@/` → `src/` (Vite + tsconfig) |
| `n8n/workflows/` | Exported workflow JSON (import via root script) |
| `scripts/` | Repo utilities (`trigger-job`, `inspect-job`, `verify-local-stack`, `n8n-clean-import`) |

## Commands (run from repo root)

- **API**: `npm run dev` / `npm start`
- **Worker**: `npm run dev:worker` / `npm run start:worker`
- **Admin**: `npm run dev:admin` or `npm run dev:full` (API + admin)
- **Build orchestrator**: `npm run build`
- **Tests**: `npm test` / `npm run test:watch` (Vitest)
- **DB**: `npm run db:generate`, `db:migrate`, `db:migrate:dev`, `db:studio`, `db:seed`
- **n8n**: `npm run n8n:import`
- **Stack check**: `npm run verify:local` (optional `verify:local:api`)
- **Langfuse (Docker)**: `npm run langfuse:up` / `langfuse:down` / `langfuse:reset`

## Conventions

- **Env**: Root `.env`; mirror keys in `.env.example`. Orchestrator reads via `orchestrator/src/config/env.ts`.
- **Orchestrator**: Prefer extending existing graph nodes, services, and repos; keep API and worker entrypoints thin.
- **Admin**: Match existing Ant Design / Pro Components patterns under `admin/src/features/ops/` and shared UI in `admin/src/shared/`. Prefer imports `@/shared/…`, `@/lib/api`, `@/features/ops/…` (same feature) over deep `../` chains.
- **n8n**: Edit JSON in `n8n/workflows/`; validate structure and connections after changes. For general n8n node/expression rules, use the separate n8n workflow skill if available.

## Related personal skills (optional)

If installed under `~/.cursor/skills/`, they complement this repo: **n8n-workflow**, **arch-and-structure**.
