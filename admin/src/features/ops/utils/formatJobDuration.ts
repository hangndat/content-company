export function formatJobDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 120) return `${m} phút`;
  const h = ms / 3_600_000;
  return `${h.toFixed(1)} giờ`;
}

const IN_FLIGHT_STATUSES = new Set(["pending", "processing", "review_required"]);

export function formatJobDuration(
  createdAt: string,
  completedAt: string | null | undefined,
  status: string
): string {
  const start = new Date(createdAt).getTime();
  if (!completedAt) {
    return IN_FLIGHT_STATUSES.has(status) ? "Đang chạy…" : "—";
  }
  const end = new Date(completedAt).getTime();
  return formatJobDurationMs(end - start);
}
