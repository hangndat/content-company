# Database Schema

See `orchestrator/prisma/schema.prisma` for the full schema. Tổng quan kiến trúc và schema: [technical.md](technical.md).

## Tables

- **Job**: Core job tracking (id, traceId, status, decision, scores, retryCount, idempotencyKey, timestamps)
- **JobInput**: Raw and normalized payload per job
- **JobOutput**: Outline, draft, reviewNotes, finalDecisionPayload, promptVersions (planner/scorer/writer/reviewer versions used)
- **ContentVersion**: Version history per job (version, draft, reviewScore) — for debug, A/B, rollback
- **JobStateSnapshot**: Graph state after each step — for crash resume
- **Approval**: Audit log (action, actor, reason, timestamp)
- **PublishedContent**: Publish log (channelId, status, publishRef, publishedAt)
- **ContentMetric**: Performance per job/channel (impressions, views, clicks, topicKey, topicLabel, topicSignature, avgReviewScore) — feeds scorer
- **PromptVersion**: Prompt versioning (type, version, content, isActive) — A/B prompts

## Migrations

```bash
npm run db:migrate:dev   # Create and apply migrations
npm run db:migrate       # Deploy migrations (production)
```
