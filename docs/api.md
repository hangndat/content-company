# Orchestrator API

Tài liệu technical đầy đủ: [technical.md](technical.md).

## Base URL
`http://localhost:3000`

## Headers (all requests)
- `x-job-id` (optional): Job UUID
- `x-trace-id` (optional): Trace UUID for observability
- `x-idempotency-key` (optional): Idempotency key for POST /run
- `x-source-system` (optional): `n8n` | `manual` | `api`
- `Authorization: Bearer <API_KEY>`: Required if API_KEY is set in env

## Endpoints

### GET /health
Returns `{ "status": "ok" }`. No auth required.

### GET /ready
Returns `{ "ready": true }` when DB and Redis are connected. 503 if not. No auth required.

### POST /v1/jobs/content/run
Create and run a content job.

**Body:** See schema in plan (sourceType, rawItems, publishPolicy, channel)

**Response 200:** `{ jobId, traceId, status, decision, createdAt, completedAt }`
**Response 201:** Idempotent duplicate (existing job)
**Response 409:** Conflict (job running or duplicate source)

### POST /v1/jobs/trend/run
Run a trend aggregate job (`sourceType: trend_aggregate`). Response shape: `{ jobId, traceId, status, createdAt, completedAt }` (sync; job completes before response).

**Body:**
- `domain` (optional, default `sports-vn`): profile in orchestrator `trends/domain-profiles.ts` (`generic` = map source by hostname only).
- `rawItems[]`: each item needs `title`, `body` (min length enforced in normalize). **Resolvable source:** either `url` (HTTP(S) URL whose host maps for the domain) **or** explicit `sourceId` (required when there is no URL or host is unknown). Validation returns 400 with field hints if any item resolves to `unknown`.
- `channel` (optional): same shape as content jobs.

**GET** `/v1/jobs/:jobId` or `/detail`: completed trend jobs expose `output.trendCandidates`.

### GET /v1/content-drafts
List persisted **ContentDraft** rows (content pipeline đã xong). Giống các route `/v1/*` khác: nếu env có `API_KEY` thì cần `Authorization: Bearer <API_KEY>`.

**Query (tất cả optional):**
- `limit` — default 50, max 100
- `offset` — default 0
- `status` — lọc theo **trạng thái job** (ví dụ `completed`, `review_required`)
- `sourceType` — lọc theo `job.sourceType` (`rss`, `trend`, …)
- `jobId` — chỉ draft của một job (UUID)

**Response:** `{ "total": number, "items": [ { "id", "jobId", "outlinePreview", "bodyPreview", "decision", "topicScore", "reviewScore", "updatedAt", "job": { "id", "status", "decision", "sourceType", "completedAt" } } ] }`

Previews là chuỗi rút gọn; nội dung đầy đủ nằm trong `GET /v1/jobs/:jobId/detail` (`contentDraft` + `job.output`).

### GET /v1/jobs/:jobId
Get job status and output.

### POST /v1/jobs/:jobId/replay
Replay a job. Optional body: `{ "fromStep": "planner" }`

### POST /v1/jobs/:jobId/approve
Approve a REVIEW_REQUIRED job. Body: `{ "actor": "user-id", "reason": "optional" }`

### POST /v1/jobs/:jobId/reject
Reject a job. Body: `{ "actor": "user-id", "reason": "required" }`

### POST /v1/jobs/:jobId/acquire-publish-slot
**Required before publish.** Checks publish dedupe (content hash) + rate limit. Body: `{ "channelId"?, "channelType"? }` — channelId/channelType optional, fallback from job inputs.

Response: `{ canPublish: boolean, reason?: "duplicate"|"rate_limit", contentHash?, current?, limit? }`. Only publish when `canPublish=true`.

### POST /v1/jobs/:jobId/publish-callback
Register publish result. Body: `{ "channelId", "publishRef", "status": "published"|"failed" }`

### POST /v1/jobs/:jobId/metrics
Record performance metrics. Body: `{ "channelId", "impressions"?, "views"?, "clicks"? }`. topicKey/topicLabel/topicSignature auto from job outline. Feeds scorer with confidence guards (N<3 light, N>=10 full boost).

**Score scales:** `reviewScore`, `topicScore`, `avgReviewScore` are all **0..1** (0=worst, 1=best).

### GET /v1/prompts
List all prompt versions by type.

### GET /v1/prompts/:type
Get prompt versions for a type (planner, scorer, writer, reviewer).

### POST /v1/prompts/:type
Create new prompt version. Body: `{ "content", "setActive"?: boolean }`.

### POST /v1/prompts/:type/activate
Set active version. Body: `{ "version" }`.

### GET /v1/metrics
Basic metrics: job counts by status and decision.

### POST /v1/admin/aggregate-metrics
Run daily topic metrics aggregation (raw ContentMetric → DailyTopicMetric). Body: `{ "days"?: 7 }`. Requires API key. Schedule via cron or n8n.

### POST /v1/admin/aggregate-experiments
Run experiment metrics aggregation. Body: `{ "days"?: 7, "experimentIds"?: string[] }`. Requires API key.

### Experiments (A/B testing)
- `POST /v1/experiments` - Create experiment + arms. Body: `{ name, nodeType, scope, scopeValue?, numBuckets?, arms: [{ name, promptVersion, bucketStart, bucketEnd }] }`. At most one arm named "control". If none, first arm is default control (see `_note` in response).
- `GET /v1/experiments` - List experiments
- `GET /v1/experiments/:id` - Detail + arms
- `POST /v1/experiments/:id/start` - status → running
- `POST /v1/experiments/:id/pause` - status → paused
- `POST /v1/experiments/:id/complete` - status → completed
- `POST /v1/experiments/:id/promote` - Promote winning arm to active prompt. Body: `{ "armId"?: string }`
- `GET /v1/experiments/:id/report` - Metrics by arm; `avgReviewScoreScale: "0..1"`; `controlArm` used for winner guards. Winner suggestion: smoothed CTR, guards (min 10 samples, approveRate drop ≤5%, avgReviewScore drop ≤0.03 vs control). Returns `cohortBy: "job_creation_date"` and note on metric-date vs creation-date.

### Dashboard (`GET /v1/dashboard/*`)
Tóm tắt Ops: `summary`, `job-trends`, `queue`, `publish`, `topics`, `channels`, `prompts`, `experiments`, v.v. Xem bảng trong [README](../README.md) hoặc [technical.md](technical.md#68-dashboard-api).

### GET /v1/settings/observability
Trạng thái Langfuse cho Admin (không trả secret).

**Query:** `days` (1–90, default 7) — cửa sổ thời gian cho metrics.

**Response (ví dụ):** `{ "enabled": true, "uiUrl": "http://localhost:3030", "days": 7, "usage": { "totalTokens": number|null, "totalCostUsd": number|null, "observationCount": number|null } | null }`

- `enabled`: có đủ `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY`.
- `uiUrl`: `LANGFUSE_UI_PUBLIC_URL` hoặc `LANGFUSE_HOST`.
- `usage`: best-effort từ Langfuse `GET /api/public/metrics`; có thể `null` nếu API lỗi hoặc chưa có dữ liệu.

Cần Bearer `API_KEY` nếu orchestrator bật `API_KEY`. `/health` và `/ready` không áp dụng route này.
