/**
 * Parse/build semantics notes for display.
 * Avoid each page reimplementing note formatting.
 */

export interface Semantics {
  cohortBy?: string;
  reviewScoreScale?: string;
  smoothedCtrFormula?: string;
  approveRateBase?: string;
}

export function semanticsToItems(semantics: Semantics | null | undefined): { key: string; value: string }[] {
  if (!semantics) return [];

  const items: { key: string; value: string }[] = [];
  if (semantics.cohortBy) items.push({ key: "Cohort by", value: semantics.cohortBy });
  if (semantics.reviewScoreScale) items.push({ key: "Review score scale", value: semantics.reviewScoreScale });
  if (semantics.smoothedCtrFormula) items.push({ key: "Smoothed CTR", value: semantics.smoothedCtrFormula });
  if (semantics.approveRateBase) items.push({ key: "Approve rate base", value: semantics.approveRateBase });

  return items;
}

export function formatSemanticsNote(semantics: Semantics | null | undefined): string {
  const items = semanticsToItems(semantics);
  if (items.length === 0) return "";
  return items.map((i) => `${i.key}: ${i.value}`).join(" · ");
}
