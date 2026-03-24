# Phân tích tính năng vận hành: content-company vs sport_content_engine

Tài liệu so sánh tính năng vận hành giữa hai project và các mục cần bổ sung để content-company vận hành tương tự sport_content_engine.

---

## 1. Kiến trúc pipeline

### sport_content_engine (Content-first)

```
Sources → Crawl → Articles → Clusters → Drafts → Approve → Publish → Posts
```

- **Content-first**: dữ liệu raw (articles, clusters) là trung tâm; drafts được tạo từ clusters.
- Nguồn dữ liệu: RSS, scraper (cấu hình trong Sources).
- Workflow biên tập: chọn cluster → tạo draft AI → chỉnh sửa/rewrite → approve → publish.

### content-company (Job-first)

```
Job Input (n8n/webhook/manual) → Pipeline (normalize→planner→scorer→writer→reviewer) → Decision → Approve → Publish
```

- **Job-first**: mỗi job là một luồng end-to-end; input → output trong một job.
- Nguồn dữ liệu: manual, webhook, rss, api (gửi qua API, không có UI quản lý sources).
- Workflow biên tập: job tạo sẵn draft → approve/reject; không có edit/rewrite trước approve.

---

## 2. Bản đồ tính năng sport_content_engine

| Trang / Tính năng | Mục đích |
|-------------------|----------|
| **Dashboard** | KPIs (sources, articles, clusters, drafts, posts), biểu đồ (articles by day, trends), last crawl, shortcuts theo pipeline |
| **Sources** | CRUD nguồn tin (RSS, scraper): URL, tier, enable/disable |
| **Crawl** | Trigger "Crawl ngay", xem lịch sử ingest runs (SSE live optional) |
| **Articles** | Danh sách bài đã crawl |
| **Clusters** | Gom tin theo topic, category; filter, ranking |
| **Cluster detail** | Articles trong cluster, score breakdown, drafts liên quan |
| **Draft creator** | Tạo draft AI từ cluster (format, tone, instruction) |
| **Cluster categories** | Nhóm topic cho filter clusters |
| **Topics & Topic rules** | Taxonomy chủ đề, quy tắc matching |
| **Drafts** | Danh sách draft, filter, approve/reject/publish |
| **Draft detail** | Edit headline/content, AI rewrite, variants, approve/reject/publish |
| **Writer history** | Audit create/rewrite |
| **Posts** | Bài đã đăng (Facebook) |
| **Settings** | GPT writer config, cluster score formula, rescore |
| **Header CTA** | Nút "Crawl ngay" → navigate /crawl?start=1 |

---

## 3. Bản đồ tính năng content-company (hiện tại)

| Trang / Tính năng | Mục đích |
|-------------------|----------|
| **Dashboard** | KPIs (jobs, decisions, publish, queue), trends, topics by CTR, prompt performance, experiments, recent jobs |
| **Jobs** | List jobs, filter status |
| **Job detail** | Approve/Reject, Replay, timeline các bước |
| **Experiments** | Start/Pause, Complete, Promote winner |
| **API-only** | `POST /v1/jobs/content/run` (script/n8n), prompts CRUD, admin aggregate |

---

## 4. Gap analysis: tính năng thiếu (theo mức độ ưu tiên)

### 4.1 Ưu tiên cao – triển khai tương đối nhanh

| # | Tính năng | Mô tả | Backend | Admin UI |
|---|-----------|-------|---------|----------|
| 1 | **Trigger job từ UI** | Nút "Run job" / "Crawl ngay" trong header | Đã có `POST /v1/jobs/content/run` | Form chọn sourceType, nhập rawItems, publishPolicy, channel; gọi API |
| 2 | **Published content list** | Trang "Bài đã đăng" như /posts | Cần `GET /v1/published` (hoặc dùng `PublishedContent` qua dashboard) | Bảng list PublishedContent, filter, link tới job |
| 3 | **Settings / Prompts** | Chỉnh GPT, kích hoạt prompt version | Đã có `GET/POST /v1/prompts/:type`, `activate` | Trang Settings: list prompts, edit, activate |
| 4 | **Edit draft trước approve** | Sửa headline/content trước khi approve | Cần `PATCH /v1/jobs/:id/output` (hoặc tương đương) | Form edit trên Job detail, rồi approve |
| 5 | **Channel performance trên Dashboard** | Hiển thị theo channel | Đã có `GET /v1/dashboard/channels` | Card/tab hiển thị byChannel từ PublishOverview |

### 4.2 Ưu tiên trung bình – cần thiết kế thêm

| # | Tính năng | Mô tả | Backend | Admin UI |
|---|-----------|-------|---------|----------|
| 6 | **Sources management** | CRUD nguồn (RSS, webhook, v.v.) | Cần schema + API cho sources | Trang Sources: list, add, edit, delete |
| 7 | **Crawl / Ingest history** | Lịch sử chạy ingest | Cần ingest_runs hoặc map jobs theo sourceType/crawl batch | Trang Crawl: list runs, trigger, optional SSE |
| 8 | **Raw inputs / "Articles"** | Xem input đã normalize | Có thể dùng JobInput + filter | Trang Articles: list job inputs, link tới job |

### 4.3 Ưu tiên thấp – thay đổi kiến trúc

| # | Tính năng | Mô tả | Ghi chú |
|---|-----------|-------|---------|
| 9 | **Clusters** | Gom bài theo chủ đề | Cần schema story_clusters, dedup, ranking; không có trong content-company |
| 10 | **Draft creator từ cluster** | Tạo draft từ cluster | Phụ thuộc clusters |
| 11 | **Topics & Topic rules** | Taxonomy chủ đề | content-company có DailyTopicMetric (CTR); khác với topic rules của sport |
| 12 | **AI Rewrite** | Rewrite draft bằng AI | Cần endpoint rewrite + streaming; có thể map tương đương với Replay từ bước writer |

---

## 5. Matrix so sánh nhanh

| Tính năng | sport_content_engine | content-company |
|-----------|----------------------|-----------------|
| Trigger ingest/job từ UI | ✓ "Crawl ngay" | ❌ Chỉ script/n8n |
| Sources CRUD | ✓ | ❌ |
| Ingest runs history | ✓ | ❌ (có jobs list) |
| Articles / Raw content list | ✓ | ❌ |
| Clusters | ✓ | ❌ |
| Draft từ cluster | ✓ | ❌ |
| Draft edit/rewrite | ✓ | ❌ (chỉ approve/reject) |
| Approve/Reject | ✓ | ✓ |
| Published posts list | ✓ /posts | ❌ |
| Settings (GPT, config) | ✓ | ❌ (API có, không có UI) |
| Writer history / Audit | ✓ | ✓ Job detail timeline |
| Experiments A/B | ❌ | ✓ |
| Replay từ step | ❌ | ✓ |
| Dashboard KPIs | ✓ | ✓ |
| Channel performance | ❌ | API có, UI chưa hiện |

---

## 6. Khuyến nghị triển khai (để vận hành tương tự sport_content_engine)

### Phase 1 – Quick wins (1–2 tuần)

1. **Trigger job từ header** – `actionsRender` gọi form/modal → `POST /v1/jobs/content/run`.
2. **Published content list** – Route `/posts`, gọi API list PublishedContent, bảng + filter.
3. **Settings page** – Route `/settings`, CRUD prompts, activate version.
4. **Channel performance** – Thêm section vào PublishOverviewCard hoặc tab riêng dùng `GET /v1/dashboard/channels`.

### Phase 2 – Editorial flow (2–4 tuần)

5. **Edit output trước approve** – `PATCH` output trên job, form edit trên Job detail.
6. **Sources management** – Nếu muốn crawl config trong app: schema + API + trang Sources.

### Phase 3 – Tùy nhu cầu

7. Ingest history (map từ jobs hoặc thêm ingest_runs).
8. Raw inputs / "Articles" view.
9. Clusters + draft từ cluster chỉ khi quyết định chuyển sang mô hình content-first.

---

## 7. Ghi chú

- **Architecture**: sport_content_engine là content-first (articles → clusters → drafts); content-company là job-first. Để giống hệt cần thêm schema và logic clustering, hoặc giữ job-first và chỉ bổ sung UX tương đương (trigger, posts list, settings, edit).
- **n8n**: content-company dùng n8n cho ingestion; sport dùng crawl trong-app. Có thể kết hợp: n8n trigger → jobs; admin thêm "Run job" để tạo job manual.
- **Ngôn ngữ**: sport dùng vi_VN; content-company dùng en_US. Có thể chuyển sang vi_VN nếu cần.
