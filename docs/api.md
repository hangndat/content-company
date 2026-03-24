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
