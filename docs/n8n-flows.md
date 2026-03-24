# n8n Workflow Flows

See `n8n/workflows/` for JSON exports and `n8n/README.md` for setup instructions.

## Flow Summary

1. **A - Trend Ingest**: Multi-RSS → Normalize → `POST /v1/jobs/trend/run` (body gồm `domain: sports-vn`) → split candidates → `POST /v1/jobs/content/run` per candidate (drafts in orchestrator DB)
2. **A - Trend Webhook Ingest**: Webhook `POST .../webhook/trend-sports-ingest` → map JSON → `POST /v1/jobs/trend/run` (mặc định `defaultSourceId` + `domain`). File: `A-trend-webhook-ingest.json`
3. **B - Manual Approval**: Webhook → Approve/Reject API → (optional) Publish nodes
4. **C - Publish Tracking**: After publish → Callback to orchestrator

Single-RSS content without trend: use `POST /v1/jobs/content/run` with `rawItems` (script `npm run trigger:job` or custom HTTP).
