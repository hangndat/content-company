# Setup & Development Guide

Hướng dẫn thiết lập môi trường và chạy project.

---

## Yêu cầu hệ thống

- Node.js 18+
- npm hoặc pnpm
- Docker & Docker Compose (PostgreSQL, Redis)
- OpenAI API key

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd content-company
npm install
cd admin && npm install && cd ..
```

---

## 2. Infrastructure

```bash
docker compose up -d
```

Kiểm tra:

- Postgres: `localhost:5433` (user: postgres, DB: content_company)
- Redis: `localhost:6380`
- n8n: `http://localhost:5678`

### Langfuse (optional — self-host hoặc Cloud)

**Cloud (đơn giản nhất):** tạo project trên [Langfuse Cloud](https://cloud.langfuse.com), copy keys → trong `.env` app:

```env
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com
```

**Self-host** (repo): stack Compose riêng, project name `langfuse` — **không** dùng chung Postgres/Redis với app.

| Host port | Dịch vụ |
|-----------|---------|
| **3030** | Langfuse UI + API ingestion |
| 5434 | Postgres Langfuse (bind `127.0.0.1`) |
| 6381 | Redis Langfuse |
| 9090 / 9091 | MinIO API / console |
| 18123, 19000 | ClickHouse (localhost) |

```bash
cp .env.langfuse.example .env.langfuse
# Bắt buộc: NEXTAUTH_SECRET và SALT = openssl rand -base64 32 mỗi cái
# ENCRYPTION_KEY = openssl rand -hex 32
# Nếu seed user qua env: bắt buộc LANGFUSE_INIT_ORG_ID (UUID) + nên có LANGFUSE_INIT_PROJECT_ID — nếu thiếu ORG_ID, web log sẽ bỏ qua toàn bộ INIT user → không đăng nhập được.

npm run langfuse:up
# hoặc: docker compose -f docker-compose.langfuse.yml --env-file .env.langfuse up -d
```

Scripts: `npm run langfuse:down` (giữ data), `npm run langfuse:reset` (`down -v` — xóa hết data Langfuse).

Sau khi UI lên (`http://localhost:3030`): đăng nhập (user seed hoặc Sign up), vào project → **API keys** → gán `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` và **`LANGFUSE_HOST=http://localhost:3030`** vào `.env` orchestrator. Tên biến **`LANGFUSE_HOST`** (không dùng `LANGFUSE_BASE_URL` trong code).

Orchestrator chạy **trong Docker** còn Langfuse trên host: `LANGFUSE_HOST=http://host.docker.internal:3030` và `LANGFUSE_UI_PUBLIC_URL=http://localhost:3030`.

Restart orchestrator sau khi sửa `.env`. Kiểm tra trace: chạy job LLM, mở Langfuse UI hoặc Admin → card **LLM observability**.

---

## 3. Environment

### Orchestrator (root)

```bash
cp .env.example .env
```

Chỉnh `.env`:

| Biến | Ghi chú |
|------|---------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/content_company` |
| `REDIS_URL` | `redis://localhost:6380` |
| `OPENAI_API_KEY` | **Bắt buộc** — key từ OpenAI |
| `API_KEY` | Optional — Bearer token cho API |
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | Optional — bật trace LLM lên Langfuse |
| `LANGFUSE_HOST` | Base URL Langfuse **API** (ingestion). Self-host: `http://localhost:3030`. Cloud: `https://cloud.langfuse.com` |
| `LANGFUSE_UI_PUBLIC_URL` | Optional — URL UI cho link Admin (khi `LANGFUSE_HOST` chỉ dùng nội bộ Docker) |

### Admin (khi dùng API_KEY)

```bash
cp admin/.env.example admin/.env
# Set VITE_API_KEY = cùng giá trị với API_KEY
```

---

## 4. Database

```bash
npm run db:migrate
npm run db:seed   # (nếu có seed)
```

Sau `docker compose up -d`, có thể kiểm tra kết nối Postgres + Redis (không cần OpenAI):

```bash
npm run verify:local
```

Khi orchestrator đã chạy (`npm run dev`), kiểm thêm `/health` và `/ready`:

```bash
npm run verify:local:api
```

---

## 5. Chạy ứng dụng

### Option A: Full stack (khuyến nghị cho dev)

```bash
npm run dev:full
```

- Orchestrator: http://localhost:3000
- Admin: http://localhost:5174

### Option B: Tách riêng

```bash
# Terminal 1: Orchestrator
npm run dev

# Terminal 2: Admin
npm run dev:admin
```

### Option C: Queue mode (async)

```bash
# .env: USE_QUEUE=1

# Terminal 1: API
npm run dev:api

# Terminal 2: Worker
npm run dev:worker
```

---

## 6. n8n (optional — automation)

n8n đã có trong `docker compose up -d` → `http://localhost:5678`.

**Local dev** (không dùng Docker):

```bash
npx n8n
```

Import workflows từ `n8n/workflows/*.json`. Cấu hình Orchestrator URL trong HTTP nodes:
- Orchestrator trên host, n8n trong Docker: `http://host.docker.internal:3000`
- Cùng host: `http://localhost:3000`

Chi tiết: [n8n/README.md](../n8n/README.md), [technical.md](technical.md#93-deploy-n8n).

---

## 7. Verify

1. **Health**: `curl http://localhost:3000/health`
2. **Ready**: `curl http://localhost:3000/ready`
3. **Trigger job**: `npm run trigger:job`
4. **Admin**: Mở http://localhost:5174
5. **Langfuse** (nếu bật): Ops Dashboard / Settings → card “LLM observability”; `GET /v1/settings/observability?days=7`

---

## 8. Aggregation (production/cron)

```bash
# Daily topic metrics
npm run aggregate:metrics
# hoặc POST /v1/admin/aggregate-metrics

# Experiment metrics
npm run aggregate:experiments
# hoặc POST /v1/admin/aggregate-experiments
```

---

## 9. Troubleshooting

| Vấn đề | Giải pháp |
|--------|-----------|
| Port 3000/5174 đã dùng | Đổi PORT trong .env, port trong vite.config.ts |
| DB connection refused | `docker compose up -d`, kiểm tra DATABASE_URL |
| Redis connection refused | Kiểm tra REDIS_URL, port 6380 |
| 401 Unauthorized | Thêm API_KEY và Authorization header |
| Invalid env | Kiểm tra OPENAI_API_KEY, DATABASE_URL đã set |
| Langfuse “Invalid credentials” / không có user sau seed | Trong log `langfuse-web`: nếu thấy `LANGFUSE_INIT_ORG_ID is not set` → mọi `LANGFUSE_INIT_USER_*` bị bỏ qua. Thêm UUID `LANGFUSE_INIT_ORG_ID` (và `LANGFUSE_INIT_PROJECT_ID`) trong `.env.langfuse`, rồi `npm run langfuse:reset` + `langfuse:up` |
| Langfuse login / session lỗi | `NEXTAUTH_SECRET` và `SALT` phải đủ mạnh (`openssl rand -base64 32`), không dùng mật khẩu ngắn |
| Metrics trống trên Admin | Langfuse metrics API có thể trả schema khác phiên bản; trace vẫn xem trực tiếp trên UI Langfuse |
