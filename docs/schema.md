# Database Schema

See `orchestrator/prisma/schema.prisma` for the full schema. Tổng quan kiến trúc và schema: [technical.md](technical.md).

## Tables

- **Job**: Core job tracking (id, traceId, status, decision, scores, retryCount, idempotencyKey, timestamps)
- **JobInput**: Raw and normalized payload per job
- **JobOutput**: Outline, draft, reviewNotes, finalDecisionPayload, promptVersions (planner/scorer/writer/reviewer versions used)
- **ContentDraft** (`content_draft`): Entity output content pipeline — 1:1 `job_id`, outline/body/reviewNotes + snapshot decision/scores; upsert khi graph xong (cùng dữ liệu với `JobOutput` cho nội dung chính)
- **ContentVersion**: Version history per job (version, draft, reviewScore) — for debug, A/B, rollback
- **JobStateSnapshot**: Graph state after each step — for crash resume
- **Approval**: Audit log (action, actor, reason, timestamp)
- **PublishedContent**: Publish log (channelId, status, publishRef, publishedAt)
- **ContentMetric**: Performance per job/channel (impressions, views, clicks, topicKey, topicLabel, topicSignature, avgReviewScore) — feeds scorer
- **PromptVersion**: Prompt versioning (type, version, content, isActive) — A/B prompts
- **TrendTopicObservation**: Fingerprint + domain + source job + candidate index — lưu khi trend job hoàn thành (`trend_topic_observation`)
- **CrawledArticle**: Bài crawl theo `dedupe_key` (URL hoặc title+body); `processed_for_trend_at` phục vụ lọc trùng trước khi chạy trend (`crawled_article`)

## Migrations

```bash
npm run db:migrate:dev   # Create and apply migrations
npm run db:migrate       # Deploy migrations (production)
```
