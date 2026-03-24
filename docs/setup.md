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
