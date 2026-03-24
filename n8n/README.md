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

### A - Ingest & Run
- **Trigger**: Manual / Schedule / RSS Feed
- **Flow**: Fetch source → Normalize → Call Orchestrator → Route by decision → **Acquire Publish Slot** (dedupe + rate limit) → Publish (if canPublish)
- **Setup**:
  1. Update RSS Feed Read node URL, or replace with Webhook/HTTP for other sources
  2. Set `ORCHESTRATOR_URL` (default: http://localhost:3000)
  3. Add `Authorization: Bearer <API_KEY>` header to Call Orchestrator if API auth is enabled
  4. Update Publish and Notify nodes with your channel webhooks (Slack, CMS API, etc.)

### B - Manual Approval
- **Trigger**: Webhook (POST to `/webhook/content-approval`)
- **Body**: `{ "jobId": "uuid", "action": "approve"|"reject", "actor": "user-id", "reason": "optional" }`
- **Flow**: Approve → Call API → Publish; Reject → Call API → Respond

### C - Publish Result Tracking
- **Trigger**: Connect after your Publish node (from A or B)
- **Flow**: Send `jobId`, `channelId`, `publishRef`, `status` to orchestrator callback
- **Purpose**: Updates `published_contents` table for audit
- **Metrics** (feedback loop): Call `POST /v1/jobs/:jobId/metrics` with `{ channelId, views, clicks }` when analytics data is available. Feeds into scorer for similar topics.

## Import workflows

**Tự động** (sau khi `docker compose up -d`):

```bash
npm run n8n:import
```

Lần đầu cần restart để mount volume: `docker compose down && docker compose up -d`

**Thủ công**: Mở http://localhost:5678 → Workflows → Import from File → Chọn file từ `n8n/workflows/*.json`

## Environment & API Key

- Orchestrator phải chạy (`npm run dev`)
- Khi orchestrator có `API_KEY` trong `.env`: n8n cần gửi `Authorization: Bearer <API_KEY>`
- **Docker Compose**: `API_KEY` từ `.env` gốc được truyền vào n8n qua `ORCHESTRATOR_API_KEY`. Workflows dùng `$env.ORCHESTRATOR_API_KEY` trong header.
- Chạy `docker compose up -d` từ thư mục có `.env` (cùng cấp với docker-compose.yml)
- Nếu `$env` không hoạt động: mở n8n UI → node HTTP → thêm header thủ công `Authorization: Bearer <API_KEY>` hoặc dùng credential "Header Auth"
