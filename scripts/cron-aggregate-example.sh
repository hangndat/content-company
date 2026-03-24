#!/usr/bin/env bash
# Example crontab (orchestrator reachable on localhost, API_KEY set):
#   0 2 * * * cd /path/to/content-company && API_KEY=... ./scripts/cron-aggregate-example.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export ORCHESTRATOR_URL="${ORCHESTRATOR_URL:-http://127.0.0.1:3000}"
if [[ -z "${API_KEY:-}" ]]; then
  echo "Set API_KEY to match orchestrator .env when API auth is enabled." >&2
  exit 1
fi
AUTH=(-H "Authorization: Bearer ${API_KEY}" -H "Content-Type: application/json")
curl -fsS "${AUTH[@]}" -d '{"days":7}' "${ORCHESTRATOR_URL}/v1/admin/aggregate-metrics" | cat
echo
curl -fsS "${AUTH[@]}" -d '{"days":7}' "${ORCHESTRATOR_URL}/v1/admin/aggregate-experiments" | cat
echo
echo "Done."
