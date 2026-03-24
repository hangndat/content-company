# Technical Documentation — Content Company

Tài liệu kỹ thuật đầy đủ cho hệ thống hybrid AI content/affiliate automation.

---

## 1. Tổng quan

**Content Company** là hệ thống pipeline nội dung AI lai tạp, kết hợp:

- **Orchestrator** (Node.js/TypeScript): API, graph xử lý nội dung, A/B testing, metrics
- **n8n**: Tự động hóa (RSS, webhook, schedule)
- **PostgreSQL**: Persistence
- **Redis**: Cache, locks, dedupe, rate limit, queue (BullMQ)
- **OpenAI**: LLM cho planner, scorer, writer, reviewer
- **Langfuse**: Observability LLM

### Luồng xử lý cơ bản

```
Source (RSS/Webhook/Manual) → Normalize → Planner → Scorer → Writer → Reviewer → Decision
                                                                    ↓
                                        APPROVED / REVIEW_REQUIRED / REJECTED
                                                                    ↓
                                        Acquire Publish Slot → Publish → Callback → Metrics
```

---

## 2. Kiến trúc hệ thống

### 2.1 High-level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              External Systems                                │
│  RSS Feeds │ n8n │ Manual API │ Webhook │ CMS / Slack (Publish targets)       │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Orchestrator (Fastify API)                            │
│  Port: 3000 │ Auth: Bearer API_KEY (optional)                                │
│  Routes: jobs, approval, publish, metrics, prompts, experiments, dashboard    │
└───┬─────────────────────────────────┬───────────────────────────────────────┘
    │                                 │
    │  Sync: runGraph()                │  Async (USE_QUEUE=1)
    │                                 ▼
    │                    ┌────────────────────────────┐
    │                    │  BullMQ Worker             │
    │                    │  Queue: content-jobs        │
    │                    │  Retry: 3, exponential      │
    │                    └────────────────────────────┘
    │                                 │
    ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Content Graph (runGraph)                              │
│  Steps: normalize → planner → scorer → writer → reviewer → decision         │
│  Persists: JobStateSnapshot (resume), ContentVersion (rollback)              │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis        │
│   Prisma 6      │    │   ioredis        │
│   content_company│   │  Locks, Dedupe   │
│                 │    │  Idempotency     │
│                 │    │  Publish Rate    │
└─────────────────┘    │  BullMQ          │
                       └─────────────────┘
```

### 2.2 Module Structure (Orchestrator)

```
orchestrator/src/
├── index.ts                 # Entry: env, db, redis, jobService, server
├── worker/index.ts           # BullMQ worker (USE_QUEUE=1)
├── config/
│   ├── env.ts               # Zod env validation
│   └── constants.ts         # DECISION, JOB_STATUS, THRESHOLDS, REDIS_TTL
├── db/
│   └── client.ts            # Prisma singleton
├── redis/
│   ├── client.ts            # Redis connection
│   ├── dedupe.ts            # Source dedupe
│   ├── idempotency.ts       # Idempotency keys
│   ├── lock.ts              # Job locks
│   ├── publish-dedupe.ts    # Content hash dedupe
│   └── publish-rate.ts      # Rate limit per channel
├── graph/
│   ├── types.ts             # GraphState, GraphContext
│   ├── runner.ts            # runGraph orchestration
│   ├── routing.ts           # Decision logic
│   └── nodes/
│       ├── normalize.ts     # rawItems → normalizedItems
│       ├── planner.ts       # Outline generation
│       ├── scorer.ts        # topicScore from DailyTopicMetric
│       ├── writer.ts        # Draft generation
│       ├── reviewer.ts      # reviewScore, reviewNotes
│       └── decision.ts      # APPROVED/REVIEW_REQUIRED/REJECTED
├── experiments/
│   ├── assignment.ts        # Hash bucket assignment
│   ├── resolver.ts          # Experiment-aware prompt resolver
│   └── constants.ts
├── lib/
│   ├── ai-client.ts         # OpenAI + Langfuse observeOpenAI
│   ├── langfuse-observability.ts  # Metrics API (admin summary)
│   ├── langfuse.ts          # getLangfuse (optional standalone client)
│   ├── logger.ts
│   ├── prompt-resolver.ts   # Prompt version resolver
│   └── topic-key.ts         # topicKey/topicSignature
├── repos/                   # Data access (Prisma)
├── services/
│   ├── job.ts               # Job orchestration (run/replay/approve)
│   └── job-queue.ts         # BullMQ enqueue
├── api/
│   ├── server.ts            # Fastify setup, route registration
│   ├── schemas.ts           # Zod schemas
│   ├── middleware/          # auth, trace, error
│   └── routes/              # All REST endpoints
├── dashboard/               # Dashboard aggregations
├── jobs/                    # Aggregate scripts logic
└── scripts/                 # aggregate-metrics, aggregate-experiment-metrics
```

### 2.3 Admin Dashboard Structure

```
admin/src/
├── main.tsx
├── App.tsx                  # Layout, routes
├── api.ts                   # fetchApi, fetchPost, api.*
├── modules/ops/
│   ├── pages/               # OpsDashboardPage, JobsListPage, JobDetailPage, etc.
│   ├── components/          # JobStepsTimeline, ExperimentTable, etc.
│   ├── hooks/               # useJobDetail, useDashboardData, etc.
│   ├── services/            # jobService, experimentService, dashboardService
│   └── models/              # job.ts, experiment.ts, dashboard.ts
└── shared/
    ├── constants/status.ts
    └── utils/
```

### 2.4 Langfuse (LLM observability)

**Luồng dữ liệu**

```
Planner / Scorer / Writer / Reviewer
        → callAI() (orchestrator/src/lib/ai-client.ts)
        → OpenAI SDK bọc bởi observeOpenAI (langfuse@3) khi có LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY
        → Langfuse ingestion tại LANGFUSE_HOST
```

- **Trace**: `traceName` = `graph.{step}`; **session** = `jobId`; **metadata** = `jobId`, `step`, `traceId`.
- **Tắt Langfuse**: bỏ trống hoặc không set public/secret key → gọi OpenAI trực tiếp (singleton client).
- **Chi phí / token**: Langfuse nhận usage từ response OpenAI; USD cost phụ thuộc **model definitions / pricing** trong project Langfuse (Cloud hoặc self-host UI).

**Orchestrator — file liên quan**

| File | Vai trò |
|------|---------|
| `lib/ai-client.ts` | `observeOpenAI`, `flushAsync` sau mỗi `callAI` |
| `lib/langfuse-observability.ts` | Gọi `GET /api/public/metrics` (Basic auth pk:sk) cho tóm tắt usage |
| `api/routes/observability.ts` | `GET /v1/settings/observability?days=` → JSON an toàn cho Admin |
| `config/env.ts` | `LANGFUSE_HOST`, `LANGFUSE_UI_PUBLIC_URL`, keys |

**Admin**

- `admin/src/modules/ops/components/LangfuseObservabilityCard.tsx` — gọi `api.observability({ days })`, hiển thị trên Ops Dashboard & Settings.

**Self-host Docker** (repo)

- `docker-compose.langfuse.yml` — project Compose tên `langfuse`, services tiền tố `langfuse-*` (tránh trùng `postgres`/`redis` với `docker-compose.yml` app).
- `.env.langfuse` — secrets stack Langfuse; **`LANGFUSE_DATABASE_URL`** tách biến để file `.env` app không ghi đè `DATABASE_URL` khi Compose merge env.
- **Bắt buộc** `LANGFUSE_INIT_ORG_ID` (UUID) nếu dùng các biến `LANGFUSE_INIT_USER_*` / `LANGFUSE_INIT_PROJECT_*`: nếu thiếu, container log cảnh báo và **bỏ qua toàn bộ seed user** → đăng nhập UI sẽ fail.

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js, ESM |
| **Language** | TypeScript 5.6 |
| **API** | Fastify 5, @fastify/cors |
| **Validation** | Zod |
| **Database** | PostgreSQL 16, Prisma 6 |
| **Cache/Queue** | Redis 7, ioredis, BullMQ |
| **AI** | OpenAI 4.x, Langfuse 3.x |
| **Logging** | Pino, pino-pretty |
| **Admin UI** | React 18, Vite 5, Ant Design 5, Ant Design Pro Components, @ant-design/charts |
| **Testing** | Vitest |
| **Tooling** | tsx, Prisma CLI |

---

## 4. Database Schema

Schema đầy đủ: `orchestrator/prisma/schema.prisma`.

### 4.1 Core Models

| Model | Mô tả |
|-------|-------|
| **Job** | Job chính: id, traceId, status, decision, topicScore, reviewScore, retryCount, idempotencyKey |
| **JobInput** | rawPayload, normalizedPayload (JSON) |
| **JobOutput** | outline, draft, reviewNotes, finalDecisionPayload, promptVersions, experimentAssignments |
| **ContentVersion** | Version history theo job (version, draft, reviewScore) — debug, rollback |
| **JobStateSnapshot** | Graph state sau mỗi bước — crash resume |
| **Approval** | Audit log: action, actor, reason |
| **PublishedContent** | Publish log: channelId, publishRef, status |
| **ContentMetric** | impressions, views, clicks, topicKey, topicLabel, topicSignature, avgReviewScore |
| **DailyTopicMetric** | Aggregated: topicKey, metricDate, avgCtr, sampleCount |
| **PromptVersion** | type, version, content, isActive |
| **Experiment** | A/B: name, nodeType, scope, status, numBuckets |
| **ExperimentArm** | promptVersion, bucketStart, bucketEnd |
| **ExperimentResultsDaily** | Metrics per experiment/arm/date |

### 4.2 Relationships (tóm tắt)

```
Job 1──1 JobInput
Job 1──1 JobOutput
Job 1──* Approval, PublishedContent, ContentMetric, JobStateSnapshot, ContentVersion
Experiment 1──* ExperimentArm
Experiment 1──* ExperimentResultsDaily
ExperimentArm 1──* ExperimentResultsDaily
```

### 4.3 Score scales

- `topicScore`, `reviewScore`, `avgReviewScore`: **0..1** (0 = worst, 1 = best)
- Các hằng số ngưỡng trong `config/constants.ts`:
  - `TOPIC_SCORE_REJECT`: 0.4
  - `REVIEW_SCORE_REJECT`: 0.5
  - `TOPIC_SCORE_APPROVE`: 0.6
  - `REVIEW_SCORE_APPROVE`: 0.7

### 4.4 Migrations

```bash
npm run db:migrate:dev    # Dev: tạo và apply migrations
npm run db:migrate        # Prod: chỉ deploy
npm run db:generate       # Regenerate Prisma client
npm run db:studio         # Prisma Studio UI
npm run db:seed           # Seed prompts (nếu có)
```

---

## 5. Content Graph Pipeline

### 5.1 Steps

| Step | Mô tả | Output |
|------|-------|--------|
| **normalize** | Chuẩn hóa rawItems, trích xuất metadata | normalizedItems |
| **planner** | Tạo outline từ normalizedItems (LLM) | outline |
| **scorer** | Điểm topic từ DailyTopicMetric, topicKey | topicScore |
| **writer** | Viết draft từ outline | draft |
| **reviewer** | Đánh giá draft (LLM) | reviewScore, reviewNotes |
| **decision** | So sánh scores vs thresholds, publishPolicy | decision |

### 5.2 GraphState (types)

```ts
{
  jobId, traceId, sourceType, topicHint,
  rawItems, publishPolicy, channel,
  normalizedItems,
  outline, topicScore,
  draft, reviewScore, reviewNotes, riskFlag,
  decision,
  retryCount, promptVersions, experimentAssignments
}
```

### 5.3 Replay & Resume

- **Replay**: `POST /v1/jobs/:jobId/replay` với `{ fromStep: "planner" }` — chạy lại từ bước đó
- **Resume**: Crash recovery dựa trên `JobStateSnapshot` — load state trước step lỗi

---

## 6. API Reference

Base URL: `http://localhost:3000`

### 6.1 Headers

| Header | Mô tả |
|--------|-------|
| `x-job-id` | Job UUID (optional) |
| `x-trace-id` | Trace UUID (optional) |
| `x-idempotency-key` | Idempotency cho POST /run |
| `x-source-system` | `n8n` \| `manual` \| `api` |
| `Authorization: Bearer <API_KEY>` | Bắt buộc nếu API_KEY trong env |

### 6.2 Health

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/health` | `{ status: "ok" }` |
| GET | `/ready` | `{ ready: true }` khi DB + Redis ok, 503 nếu không |

### 6.3 Jobs

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/v1/jobs/trend/run` | Trend aggregate. Body: `domain?`, `rawItems[]`, `channel?`. Mỗi item cần map được nguồn: `url` (host known) hoặc `sourceId`. Output: `trendCandidates` |
| POST | `/v1/jobs/content/run` | Tạo và chạy job. Body: sourceType, rawItems, publishPolicy, channel. Hoặc trendJobId + topicIndex? (lấy rawItems từ trend job) |
| GET | `/v1/jobs` | List jobs (limit, offset, status) |
| GET | `/v1/jobs/:jobId` | Chi tiết job |
| GET | `/v1/jobs/:jobId/detail` | Chi tiết đầy đủ (inputs, outputs, approvals) |
| POST | `/v1/jobs/:jobId/replay` | Replay, body: `{ fromStep? }` |
| POST | `/v1/jobs/:jobId/approve` | Approve (REVIEW_REQUIRED). Body: actor, reason? |
| POST | `/v1/jobs/:jobId/reject` | Reject. Body: actor, reason (required) |
| POST | `/v1/jobs/:jobId/acquire-publish-slot` | Kiểm tra dedupe + rate limit trước publish |
| POST | `/v1/jobs/:jobId/publish-callback` | Đăng ký kết quả publish |
| POST | `/v1/jobs/:jobId/metrics` | Ghi impressions, views, clicks |

### 6.4 Run job body (schema)

```json
{
  "sourceType": "rss|webhook|manual|api",
  "topicHint": "optional",
  "rawItems": [
    { "title": "...", "body": "...", "url": "optional", "publishedAt": "optional" }
  ],
  "publishPolicy": "auto|review_only|manual_only",
  "channel": { "id": "...", "type": "blog|social|affiliate", "metadata": {} }
}
```

### 6.4.1 Trend job body (`POST /v1/jobs/trend/run`)

```json
{
  "domain": "sports-vn",
  "rawItems": [
    {
      "title": "...",
      "body": "...",
      "url": "https://...",
      "sourceId": "optional — bắt buộc nếu không có url hoặc host không map",
      "id": "optional",
      "publishedAt": "optional"
    }
  ],
  "channel": { "id": "blog-1", "type": "blog", "metadata": {} }
}
```

Profile `sports-vn` gồm báo VN + mạng xã hội phổ biến (x/youtube/facebook/tiktok/…); `generic` chỉ dùng segment đầu hostname.

### 6.5 Prompts

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/v1/prompts` | List prompt types |
| GET | `/v1/prompts/:type` | Versions cho type |
| POST | `/v1/prompts/:type` | Tạo version. Body: content, setActive? |
| POST | `/v1/prompts/:type/activate` | Set active. Body: version |

### 6.6 Metrics & Admin

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/v1/metrics` | Job counts by status/decision |
| POST | `/v1/admin/aggregate-metrics` | Chạy daily topic aggregation |
| POST | `/v1/admin/aggregate-experiments` | Chạy experiment aggregation |

### 6.7 Experiments (A/B)

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/v1/experiments` | Tạo experiment + arms |
| GET | `/v1/experiments` | List experiments |
| GET | `/v1/experiments/:id` | Chi tiết + arms |
| POST | `/v1/experiments/:id/start` | status → running |
| POST | `/v1/experiments/:id/pause` | status → paused |
| POST | `/v1/experiments/:id/complete` | status → completed |
| POST | `/v1/experiments/:id/promote` | Promote winning arm |
| GET | `/v1/experiments/:id/report` | Metrics by arm, winner suggestion |

### 6.8 Dashboard API

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/v1/dashboard/summary` | Overview jobs, publish, queue |
| GET | `/v1/dashboard/job-trends` | Job trends |
| GET | `/v1/dashboard/queue` | BullMQ counts |
| GET | `/v1/dashboard/publish` | Publish by day/channel |
| GET | `/v1/dashboard/topics` | Topic performance |
| GET | `/v1/dashboard/channels` | Channel performance |
| GET | `/v1/dashboard/prompts` | Prompt performance |
| GET | `/v1/dashboard/experiments` | Experiment list |
| GET | `/v1/settings/observability` | Langfuse: `enabled`, `uiUrl`, `days`, `usage` (best-effort metrics); không lộ secret key |

Query `observability`: `days` (1–90, default 7). Cần Bearer `API_KEY` nếu orchestrator bật `API_KEY`.

Chi tiết: [docs/api.md](api.md).

---

## 7. Cấu hình & Environment

### 7.1 Orchestrator (.env)

| Biến | Mô tả | Default |
|------|-------|---------|
| PORT | API port | 3000 |
| NODE_ENV | development \| production \| test | development |
| DATABASE_URL | PostgreSQL connection string | - |
| REDIS_URL | Redis connection string | redis://localhost:6379 |
| API_KEY | Bearer token (optional) | - |
| OPENAI_API_KEY | OpenAI key | - |
| OPENAI_MODEL_PRIMARY | Model chính | gpt-4o-mini |
| OPENAI_MODEL_FALLBACK | Fallback model | gpt-3.5-turbo |
| LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY | Bật trace OpenAI qua Langfuse SDK (`observeOpenAI`) | optional |
| LANGFUSE_HOST | Base URL Langfuse **API** (ingestion/SDK), **không** dùng tên `LANGFUSE_BASE_URL` trong code | `https://cloud.langfuse.com` |
| LANGFUSE_UI_PUBLIC_URL | URL UI mở trong browser từ Admin (khi `LANGFUSE_HOST` chỉ reachable nội bộ, ví dụ Docker network) | = `LANGFUSE_HOST` |
| USE_QUEUE | 1=true: dùng BullMQ | 0 |

### 7.2 Admin (admin/.env)

| Biến | Mô tả |
|------|-------|
| VITE_API_KEY | API key cho dashboard (Bearer) |

### 7.3 Docker Compose

- **Postgres**: port 5433→5432, DB `content_company`
- **Redis**: port 6380→6379

```bash
docker compose up -d
```

**Langfuse** (tách file, project `langfuse`): `npm run langfuse:up` hoặc `docker compose -f docker-compose.langfuse.yml --env-file .env.langfuse up -d` — UI **host `3030`**, Postgres `127.0.0.1:5434`, Redis `127.0.0.1:6381`, MinIO `9090`, ClickHouse `18123`/`19000`. Không merge tên service `postgres`/`redis` với stack app; dùng `LANGFUSE_DATABASE_URL` trong `.env.langfuse` để Compose không lấy nhầm `DATABASE_URL` từ `.env` gốc.

- **`npm run langfuse:down`**: dừng stack, **giữ** volume.
- **`npm run langfuse:reset`**: `down -v` — xóa toàn bộ data Langfuse (Postgres/ClickHouse/MinIO/Redis của project này).

Postgres & ClickHouse trong compose Langfuse dùng **TZ=UTC** theo khuyến nghị Langfuse.

### 7.4 File `.env.langfuse` (chỉ cho stack Docker Langfuse)

| Biến | Mô tả |
|------|--------|
| `LANGFUSE_NEXTAUTH_URL` | URL browser tới UI, ví dụ `http://localhost:3030` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` — không dùng chuỗi ngắn |
| `SALT` | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` (64 ký tự hex) |
| `LANGFUSE_DATABASE_URL` | Connection string Postgres **container** `langfuse-postgres` |
| `LANGFUSE_INIT_ORG_ID` | **UUID** — bắt buộc nếu muốn seed user/project qua `LANGFUSE_INIT_*` |
| `LANGFUSE_INIT_PROJECT_ID` | UUID project (khuyến nghị set cùng org seed) |
| `LANGFUSE_INIT_USER_EMAIL` / `PASSWORD` / `USER_NAME` | User đăng nhập lần đầu (chỉ khi DB Langfuse trống / sau reset volume) |

Sao chép từ `.env.langfuse.example` và thay mọi `CHANGEME`.

Admin đọc trạng thái Langfuse qua `GET /v1/settings/observability` (Bearer `API_KEY` nếu có); orchestrator gọi Langfuse metrics API server-side, response **không** chứa secret.

---

## 8. Scripts & Tooling

### 8.1 Development

| Script | Mô tả |
|--------|-------|
| `npm run dev` | Orchestrator (tsx watch) |
| `npm run dev:admin` | Admin UI (Vite, port 5174) |
| `npm run dev:full` | Cả orchestrator + admin |
| `npm run dev:api` | Orchestrator (alias) |
| `npm run dev:worker` | BullMQ worker (USE_QUEUE=1) |
| `npm run langfuse:up` | Langfuse Docker stack (`--env-file .env.langfuse`) |
| `npm run langfuse:down` | Dừng Langfuse, giữ volume |
| `npm run langfuse:reset` | `down -v` Langfuse — xóa data |

### 8.2 Build & Run

| Script | Mô tả |
|--------|-------|
| `npm run build` | Compile orchestrator → dist/ |
| `npm run start` | Chạy orchestrator đã build |
| `npm run start:worker` | Chạy worker đã build |

### 8.3 Database

| Script | Mô tả |
|--------|-------|
| `npm run db:generate` | prisma generate |
| `npm run db:migrate` | prisma migrate deploy |
| `npm run db:migrate:dev` | prisma migrate dev |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed data |

### 8.4 Aggregation & CLI

| Script | Mô tả |
|--------|-------|
| `npm run aggregate:metrics` | Daily topic metrics aggregation |
| `npm run aggregate:experiments` | Experiment metrics aggregation |
| `npm run trigger:job` | Tạo job mẫu qua API |
| `npm run inspect:job <id>` | Inspect job (CLI) |

### 8.5 Test

| Script | Mô tả |
|--------|-------|
| `npm run test` | Vitest run |
| `npm run test:watch` | Vitest watch |

---

## 9. n8n Integration

### 9.1 Workflows

| Workflow | Mô tả | File |
|----------|-------|------|
| **A - Trend Ingest** | Multi-RSS → trend job → content jobs (draft) | A-trend-ingest.json |
| **B - Manual Approval** | Webhook approve/reject → API | B-manual-approval.json |
| **C - Publish Tracking** | Callback sau publish | C-publish-tracking.json |
| **D - Publish to Webhook** | Acquire slot → POST ngoài (CMS/hook) → publish-callback | D-publish-to-webhook.json |
| **D - Daily aggregates** | Schedule/Manual → aggregate-metrics → aggregate-experiments | D-daily-aggregates.json |

### 9.2 Cấu hình n8n

1. Import JSON từ `n8n/workflows/`
2. Cấu hình `ORCHESTRATOR_URL` trong HTTP nodes
3. Thêm header `Authorization: Bearer <API_KEY>` nếu có

### 9.3 Deploy n8n

#### Option A: Local (dev)

```bash
npx n8n
# Mở http://localhost:5678
```

#### Option B: Docker

```bash
docker volume create n8n_data

docker run -d \
  --name n8n \
  -p 5678:5678 \
  -e TZ="Asia/Ho_Chi_Minh" \
  -e GENERIC_TIMEZONE="Asia/Ho_Chi_Minh" \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

#### Option C: Docker Compose (cùng project)

n8n đã có trong `docker-compose.yml`. Chạy: `docker compose up -d`.

**Lưu ý**: Khi n8n chạy trong Docker, gọi orchestrator trên host dùng `http://host.docker.internal:3000` (Mac/Windows) hoặc IP host (Linux).

#### Option D: n8n Cloud

Dùng [n8n Cloud](https://n8n.io/cloud/) — không cần self-host. Chỉ cần cấu hình Webhook URL và Orchestrator URL (phải public hoặc qua tunnel).

#### Environment n8n cần khi deploy

| Biến | Mô tả |
|------|-------|
| `TZ` / `GENERIC_TIMEZONE` | Timezone cho Schedule nodes |
| `N8N_HOST` | Host bind (0.0.0.0 cho Docker) |
| `DB_TYPE=postgresdb` + `DB_POSTGRESDB_*` | Dùng Postgres thay SQLite (production) |

Trong workflow: cấu hình `ORCHESTRATOR_URL` và `Authorization: Bearer <API_KEY>` trong HTTP Request nodes.

Chi tiết: [n8n/README.md](../n8n/README.md), [docs/n8n-flows.md](n8n-flows.md).

---

## 10. A/B Testing (Experiments)

### 10.1 Khái niệm

- **Experiment**: Thử nghiệm prompt theo nodeType (planner, scorer, writer, reviewer)
- **Arm**: Một biến thể (control, variant_a, ...) với promptVersion và bucket range
- **Assignment**: Hash(jobId + experimentId + scopeValue) % numBuckets → chọn arm

### 10.2 Scope

- `global`, `channel`, `topic`, `source_type`
- `scopeValue` tùy scope (e.g. channel.id, topic_key)

### 10.3 Aggregation

- `ExperimentResultsDaily`: jobsCount, approvedCount, impressions, views, clicks, avgReviewScore, smoothedCtr
- Chạy `POST /v1/admin/aggregate-experiments` hoặc `npm run aggregate:experiments`

### 10.4 Winner suggestion

- smoothedCtr cao nhất
- Guard: min 10 samples, approveRate drop ≤5%, avgReviewScore drop ≤0.03 vs control

Chi tiết: [docs/ab-testing-design.md](ab-testing-design.md).

---

## 11. Feedback Loop & Metrics

1. **ContentMetric**: impressions, views, clicks theo job/channel
2. **DailyTopicMetric**: aggregate theo topicKey, metricDate
3. **Scorer**: N<3 → reference only; 3–10 → light boost; N≥10 → full boost
4. **topicKey/topicSignature**: stable across wording

---

## 12. Publish Safety

- **Dedupe**: Content hash (7 ngày)
- **Rate limit**: Theo channelType (blog: 10/h, social: 5/h, affiliate: 3/h)
- **Acquire slot**: Gọi trước khi publish thực tế
- **Callback**: Đăng ký kết quả publish

---

## 13. Tài liệu liên quan

| Document | Mô tả |
|----------|-------|
| [api.md](api.md) | API contract chi tiết |
| [schema.md](schema.md) | Database schema tóm tắt |
| [n8n-flows.md](n8n-flows.md) | Tóm tắt n8n flows |
| [ab-testing-design.md](ab-testing-design.md) | Thiết kế A/B testing |
