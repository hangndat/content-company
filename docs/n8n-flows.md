# n8n Workflow Flows

See `n8n/workflows/` for JSON exports and `n8n/README.md` for setup instructions.

## Flow Summary

1. **A - Ingest & Run**: Source → Normalize → Orchestrator → Route by decision (APPROVED → Publish, else → Notify)
2. **B - Manual Approval**: Webhook → Approve/Reject API → Publish or Respond
3. **C - Publish Tracking**: After publish → Callback to orchestrator
