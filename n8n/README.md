# n8n Workflows for Content Pipeline

## Deploy n8n

### Local (dev)

```bash
npx n8n
# http://localhost:5678
```

### Docker

```bash
docker volume create n8n_data

docker run -d --name n8n \
  -p 5678:5678 \
  -e TZ="Asia/Ho_Chi_Minh" \
  -e GENERIC_TIMEZONE="Asia/Ho_Chi_Minh" \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

### Docker Compose (cùng với Postgres + Redis của project)

n8n đã có trong `docker-compose.yml` gốc. Chạy: `docker compose up -d`.

**Orchestrator URL** trong workflow:
- n8n chạy Docker, orchestrator trên host: `http://host.docker.internal:3000` (Mac/Win)
- Cùng host: `http://localhost:3000`
- Production: URL public của orchestrator

---

## Workflows

### A - Trend Ingest (flow chính)

- **File**: `A-trend-ingest.json`
- **Trigger**: Manual / Schedule
- **Flow**: Multi-RSS → Merge → Normalize (tối đa 100 bài mới, body cắt 1200 ký tự) → `POST /v1/jobs/trend/run` → GET job → Split candidates (tối đa 10) → `POST /v1/jobs/content/run` mỗi candidate
- **Output**: 1 job `trend_aggregate` + tối đa 10 job content (`sourceType: trend`) với draft trong DB

Content-only từ trend job đã có: gọi trực tiếp API `POST /v1/jobs/content/run` với `trendJobId` + `topicIndex`, hoặc Admin.

### A - Trend Webhook Ingest (không RSS)

- **File**: `A-trend-webhook-ingest.json`
- **Trigger**: Webhook POST path `trend-sports-ingest` (production URL dạng `https://<n8n-host>/webhook/trend-sports-ingest` — kiểm tra trong n8n sau khi import)
- **Body gợi ý**: `{ "rawItems": [{ "title", "body", "url?", "sourceId?" }], "domain": "sports-vn", "defaultSourceId": "my-connector", "channel": { ... } }` — item thiếu `sourceId` sẽ dùng `defaultSourceId`; mỗi item vẫn cần body ≥ 50 ký tự
- **Flow**: Map → (skip nếu rỗng) → `POST /v1/jobs/trend/run` → respond JSON jobId

### B - Manual Approval

- **File**: `B-manual-approval.json`
- **Trigger**: Webhook (POST to `/webhook/content-approval`)
- **Body**: `{ "jobId": "uuid", "action": "approve"|"reject", "actor": "user-id", "reason": "optional" }`
- **Flow**: Approve/Reject → gọi orchestrator API → (tuỳ node) Publish placeholder

### C - Publish Result Tracking

- **File**: `C-publish-tracking.json`
- **Trigger**: Nối sau node Publish của bạn
- **Flow**: Gửi `jobId`, `channelId`, `publishRef`, `status` tới orchestrator callback
- **Mục đích**: `published_contents` + có thể gọi `POST /v1/jobs/:jobId/metrics` sau

### D - Publish to Webhook (luồng publish thật tối thiểu)

- **File**: `D-publish-to-webhook.json`
- **Trigger**: Manual
- **Flow**: `GET /v1/jobs/:id` → chỉ tiếp khi `decision === APPROVED` → `POST .../acquire-publish-slot` → khi `canPublish` → `POST` tới URL ngoài (CMS/Zapier/server của bạn) với JSON `jobId`, `draft`, `outline`, `channelId`, `contentHash` → `POST .../publish-callback` (`status: published`, `publishRef` lấy từ response webhook nếu có)
- **Cấu hình**: Biến môi trường n8n **`PUBLISH_WEBHOOK_URL`** (docker-compose đã truyền từ `.env`). Điền `jobId` (và tuỳ chọn `channelId`) trong node **Set jobId and channel**.

### D - Daily aggregates (cron qua n8n)

- **File**: `D-daily-aggregates.json`
- **Trigger**: Schedule (cron `0 2 * * *`) + Manual để test
- **Flow**: `POST /v1/admin/aggregate-metrics` → `POST /v1/admin/aggregate-experiments` (body `{ "days": 7 }`, Bearer `ORCHESTRATOR_API_KEY`)
- **Lưu ý**: Bật **Active** trong n8n để schedule chạy; timezone theo container (`Asia/Ho_Chi_Minh` trong compose).

**Cron trên host (không dùng n8n):** xem [`scripts/cron-aggregate-example.sh`](../scripts/cron-aggregate-example.sh).

---

## Import workflows

**Clean + Import** (xóa workflow cũ trong n8n rồi import từ `n8n/workflows/`):

```bash
npm run n8n:import
```

- Gọi n8n API xóa tất cả workflows
- `docker compose exec n8n n8n import:workflow` để import
- Cần n8n chạy (`docker compose up -d`)
- Nếu n8n bật API key: thêm `N8N_API_KEY` vào `.env`

Lần đầu cần restart để mount volume: `docker compose down && docker compose up -d`

**Thủ công**: Mở http://localhost:5678 → Workflows → Import from File → Chọn file từ `n8n/workflows/*.json`

## Environment & API Key

- Orchestrator phải chạy (`npm run dev`)
- Khi orchestrator có `API_KEY` trong `.env`: n8n cần gửi `Authorization: Bearer <API_KEY>`
- **Docker Compose**: `API_KEY` từ `.env` gốc được truyền vào n8n qua `ORCHESTRATOR_API_KEY`. Workflows dùng `$env['ORCHESTRATOR_API_KEY']` trong header.
- Chạy `docker compose up -d` từ thư mục có `.env` (cùng cấp với docker-compose.yml)
- Nếu `$env` không hoạt động: mở n8n UI → node HTTP → thêm header thủ công `Authorization: Bearer <API_KEY>` hoặc dùng credential "Header Auth"
