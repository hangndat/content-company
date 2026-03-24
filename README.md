# Content Company - Hybrid AI Content/Affiliate Automation

Hybrid AI content pipeline với n8n (execution), Node.js/TS orchestrator (decision), Redis, Postgres, Langfuse.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start infra (Postgres + Redis + n8n)
docker compose up -d

# 3. Configure env
cp .env.example .env
# Edit .env: set OPENAI_API_KEY, DATABASE_URL, REDIS_URL, API_KEY

# 4. Run migrations
npm run db:migrate

# 5. Start orchestrator + admin (full flow)
npm run dev:full
# → Orchestrator: http://localhost:3000
# → Admin Dashboard: http://localhost:5174
```

**Alternatives:**
- `npm run dev` — orchestrator only
- `npm run dev:admin` — admin only (orchestrator must be running)
- Queue mode: `USE_QUEUE=1 npm run dev:api` + `npm run dev:worker` (separate terminals)

## Structure

- `orchestrator/` - Node.js + TypeScript API + AI graph
- `admin/` - Ops Dashboard UI (Vite + React + Ant Design ProComponents)
- `n8n/workflows/` - n8n workflow JSON exports
- `docs/` - Technical docs, API, schema, flows
  - **[docs/technical.md](docs/technical.md)** - Tài liệu kỹ thuật đầy đủ
  - [docs/setup.md](docs/setup.md) - Setup & development guide

## API

- `GET /health` - Liveness
- `GET /ready` - Readiness (DB + Redis)
- `POST /v1/jobs/content/run` - Create & run content job
- `GET /v1/jobs/:id` - Get job
- `POST /v1/jobs/:id/approve` | `reject` | `replay`
- `GET /v1/metrics` - Basic metrics
- **Dashboard API** (`/v1/dashboard/*`) - Ops dashboard & experiment reporting

See [docs/api.md](docs/api.md) for details.

### Dashboard API (Ops & Experiment Reporting)

All dashboard endpoints require API key (Bearer token) when `API_KEY` is set.

| Endpoint | Description |
|----------|-------------|
| `GET /v1/dashboard/summary?days=1` | Jobs, publish, queue overview |
| `GET /v1/dashboard/job-trends?granularity=day&days=7` | Job creation/completion trends |
| `GET /v1/dashboard/queue` | BullMQ counts (waiting, active, etc.) |
| `GET /v1/dashboard/publish?days=7` | Publish by day, by channel |
| `GET /v1/dashboard/topics?days=7&limit=20&sortBy=avgCtr` | Topic performance (DailyTopicMetric) |
| `GET /v1/dashboard/channels?days=7` | Channel performance |
| `GET /v1/dashboard/prompts?type=writer&days=14` | Prompt version performance |
| `GET /v1/dashboard/prompts/versions?type=writer` | Prompt versions detail |
| `GET /v1/dashboard/experiments?status=running` | Experiment list + winner suggestion |
| `GET /v1/experiments/:id/report?days=30` | Experiment detail + guards |

**Semantics** (included in responses): `cohortBy=job_creation_date`, `reviewScoreScale=0..1`, `smoothedCtrFormula=(clicks+1)/(views+10)`, `approveRateBase=jobsCount`.

### Admin Dashboard UI

Chạy cùng `npm run dev:full` hoặc riêng: `npm run dev:admin` (sau khi orchestrator đã chạy).

Nếu orchestrator có `API_KEY`, thêm vào `admin/.env`:
```
VITE_API_KEY=123123
```
(ví dụ: dùng cùng giá trị với `API_KEY` trong `.env` gốc)

## Trigger Content Pipeline (crawl + write bài)

### Cách 1: Script (nhanh, test thủ công)

```bash
# Orchestrator phải đang chạy (npm run dev hoặc npm run dev:full)
npm run trigger:job
```

Tạo 1 job mẫu, chạy planner → scorer → writer → reviewer. Mặc định `publishPolicy: review_only` (cần approve thủ công).

### Cách 2: n8n (tự động theo RSS/schedule)

1. Chạy n8n: `npx n8n` (hoặc Docker)
2. Import workflow: `n8n/workflows/A-ingest-run.json`
3. Cấu hình:
   - **RSS Feed Read**: đổi URL feed, hoặc thay bằng Webhook/Schedule trigger
   - **Call Orchestrator**: thêm header `Authorization: Bearer <API_KEY>` nếu có
   - **Publish node**: đổi webhook (Slack, CMS API, ...)
4. Execute: Manual Trigger (test) hoặc Schedule (chạy định kỳ)

## n8n Workflows

1. **A - Ingest & Run**: RSS/Webhook → Orchestrator → Acquire Slot → Publish/Notify by decision
2. **B - Manual Approval**: Webhook approve/reject → API → Publish
3. **C - Publish Tracking**: Callback after publish; metrics for feedback loop

Import: `npm run n8n:import` (n8n phải đang chạy). Hoặc import thủ công từ `n8n/workflows/*.json`. See [n8n/README.md](n8n/README.md).

## Feedback Loop (Priority 2)

- **Metrics**: `POST /v1/jobs/:jobId/metrics` — record impressions/views/clicks
- **Topic identifiers**: topic_key (slug), topic_label (human), topic_signature (hash) — stable across wording
- **Scorer confidence**: N<3 → reference only; 3–10 → light boost; N≥10 → full boost
- **Job→prompt link**: `promptVersions` in JobOutput stores which prompt version produced each job
- **Prompts**: `GET/POST /v1/prompts/:type` — version prompts. Seed: `npm run db:seed`

## Priority 3 (implemented)

- **A.** BullMQ queue: `USE_QUEUE=1` → API enqueues, worker (`npm run dev:worker`) runs graph. Retry: 3 attempts, exponential backoff.
- **B.** Worker separation: `dev:api` and `dev:worker` scripts; scale independently.
- **C.** Publish safety: dedupe, rate limit, idempotent publish — see [docs/api.md](docs/api.md).
- **D.** Metrics aggregation: `DailyTopicMetric` table; scorer reads aggregates. Run `npm run aggregate:metrics` (or `POST /v1/admin/aggregate-metrics`) daily.
