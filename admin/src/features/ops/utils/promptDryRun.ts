import type { JobStepSnapshot } from "@/features/ops/models/job";

export type DryRunSnapOption = { value: string; label: string; createdAt: string };

export function stepLabelVi(step: string): string {
  const labels: Record<string, string> = {
    normalize: "Sau normalize (nguồn đã chuẩn hoá)",
    planner: "Sau planner (có dàn ý)",
    scorer: "Sau scorer",
    writer: "Sau writer (có bản nháp)",
    reviewer: "Sau reviewer",
    decision: "Sau decision",
  };
  return labels[step] ?? step;
}

/** Snapshot hợp lệ để làm input cho dry-run agent này (mỗi bước giữ bản mới nhất nếu replay). */
export function buildDryRunSnapshotOptions(
  promptType: string,
  steps: JobStepSnapshot[]
): DryRunSnapOption[] {
  const byStep = new Map<string, DryRunSnapOption>();
  for (const s of steps) {
    const st = s.stateJson;
    const ni = st.normalizedItems as unknown[] | undefined;
    const hasItems = Array.isArray(ni) && ni.length > 0;
    const outline = typeof st.outline === "string" && st.outline.trim().length > 0;
    const draft = typeof st.draft === "string" && st.draft.trim().length > 0;
    let ok = false;
    switch (promptType) {
      case "planner":
        ok = s.step === "normalize" && hasItems;
        break;
      case "scorer":
        ok = ["planner", "scorer", "writer", "reviewer", "decision"].includes(s.step) && outline;
        break;
      case "writer":
        ok =
          ["planner", "scorer", "writer", "reviewer", "decision"].includes(s.step) && outline && hasItems;
        break;
      case "reviewer":
        ok = ["writer", "reviewer", "decision"].includes(s.step) && draft;
        break;
      default:
        ok = false;
    }
    if (ok) {
      byStep.set(s.step, {
        value: s.step,
        label: `${stepLabelVi(s.step)} — ${s.step}`,
        createdAt: s.createdAt,
      });
    }
  }
  return [...byStep.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/**
 * Snapshot mặc định = trạng thái đúng ngữ cảnh trước khi node agent đó chạy.
 */
export function preferredSnapshotStepForAgent(
  agentType: string,
  options: DryRunSnapOption[]
): string | undefined {
  if (options.length === 0) return undefined;
  const eligible = new Set(options.map((o) => o.value));
  const firstEligible = (order: readonly string[]): string | undefined => {
    for (const step of order) {
      if (eligible.has(step)) return step;
    }
    return undefined;
  };
  switch (agentType) {
    case "planner":
      return firstEligible(["normalize"]);
    case "scorer":
      return firstEligible(["planner", "scorer", "writer", "reviewer", "decision"]);
    case "writer":
      return firstEligible(["scorer", "planner", "writer", "reviewer", "decision"]);
    case "reviewer":
      return firstEligible(["writer", "reviewer", "decision"]);
    default:
      return options[options.length - 1]?.value;
  }
}

export function latestRecordedPipelineStep(steps: JobStepSnapshot[]): string | undefined {
  if (!steps.length) return undefined;
  return [...steps].reduce((best, s) =>
    new Date(s.createdAt).getTime() > new Date(best.createdAt).getTime() ? s : best
  ).step;
}

/** stateJson của snapshot mới nhất cho bước đó (khớp logic getByStep phía server). */
export function getStateForSnapshotStep(
  steps: JobStepSnapshot[],
  snapshotStep: string
): Record<string, unknown> | null {
  const matches = steps.filter((s) => s.step === snapshotStep);
  if (!matches.length) return null;
  const last = matches[matches.length - 1]!;
  const json = last.stateJson;
  return json && typeof json === "object" ? (json as Record<string, unknown>) : null;
}

export type PlaceholderPreviewBlock = { key: string; label: string; content: string };

/** Chuỗi sẽ được thế vào {{PLACEHOLDER}} khi dry-run (khớp orchestrator; FEEDBACK_SECTION chỉ đầy đủ trên server). */
export function buildPlaceholderPreview(
  agentType: string,
  state: Record<string, unknown>
): PlaceholderPreviewBlock[] {
  const normalizedItems = state.normalizedItems as Array<{ title?: string; body?: string }> | undefined;
  const outline = typeof state.outline === "string" ? state.outline : "";
  const draft = typeof state.draft === "string" ? state.draft : "";

  switch (agentType) {
    case "planner": {
      const items = Array.isArray(normalizedItems) ? normalizedItems : [];
      const sourceText = JSON.stringify(
        items.map((i) => ({ title: i.title ?? "", body: (i.body ?? "").slice(0, 500) })),
        null,
        2
      );
      return [{ key: "SOURCE_ITEMS", label: "SOURCE_ITEMS", content: sourceText || "(trống)" }];
    }
    case "scorer":
      return [
        { key: "OUTLINE", label: "OUTLINE", content: outline.trim() || "(trống)" },
        {
          key: "FEEDBACK_SECTION",
          label: "FEEDBACK_SECTION",
          content:
            "— (Orchestrator ghép phản hồi metrics topic từ DB khi bạn bấm Chạy thử; preview không có dữ liệu này.)",
        },
      ];
    case "writer": {
      const items = Array.isArray(normalizedItems) ? normalizedItems : [];
      const sourceSummary = items
        .map((i) => `${i.title ?? ""}: ${(i.body ?? "").slice(0, 200)}...`)
        .join("\n\n");
      return [
        { key: "OUTLINE", label: "OUTLINE", content: outline.trim() || "(trống)" },
        { key: "SOURCE_SUMMARY", label: "SOURCE_SUMMARY", content: sourceSummary || "(trống)" },
      ];
    }
    case "reviewer": {
      const clipped = draft.length > 2000 ? `${draft.slice(0, 2000)}\n\n… (${draft.length} ký tự, gửi tối đa 2000 như pipeline)` : draft;
      return [{ key: "DRAFT", label: "DRAFT", content: clipped.trim() ? clipped : "(trống)" }];
    }
    default:
      return [];
  }
}

/** Snapshot mới nhất cho một bước (replay có thể tạo nhiều dòng). */
export function getLatestSnapshotForStep(
  steps: JobStepSnapshot[],
  stepName: string
): JobStepSnapshot | null {
  const matches = steps.filter((s) => s.step === stepName);
  if (!matches.length) return null;
  return matches.reduce((best, s) =>
    new Date(s.createdAt).getTime() > new Date(best.createdAt).getTime() ? s : best
  );
}

/** Kết quả đã lưu trên job sau khi agent này chạy thật (để so với dry-run). */
export type PipelineBaseline = {
  /** Nhãn hiển thị (có thời điểm snapshot) */
  label: string;
  /** Nội dung so sánh trực diện (pre) */
  displayText: string;
  scorerTopicScore?: number;
  reviewerReviewScore?: number;
  reviewerRiskFlag?: boolean;
  plannerOutline?: string;
};

export function extractPipelineBaseline(agentType: string, steps: JobStepSnapshot[]): PipelineBaseline | null {
  const snap = getLatestSnapshotForStep(steps, agentType);
  if (!snap) return null;
  const st = snap.stateJson as Record<string, unknown>;
  const t = new Date(snap.createdAt).toLocaleString("vi-VN");

  switch (agentType) {
    case "planner": {
      const outline = typeof st.outline === "string" ? st.outline : "";
      return {
        label: `Pipeline sau planner · ${t}`,
        displayText: outline.trim() ? outline : "(không có outline trong state)",
        plannerOutline: outline,
      };
    }
    case "scorer": {
      const raw = st.topicScore;
      const n = typeof raw === "number" ? raw : Number(raw);
      const ts = Number.isFinite(n) ? n : undefined;
      const outline = typeof st.outline === "string" ? st.outline : "";
      return {
        label: `Pipeline sau scorer · ${t}`,
        displayText:
          `topicScore (đã lưu): ${ts != null ? String(ts) : "—"}\n\n` +
          `outline (đầu 600 ký tự):\n${outline.slice(0, 600)}${outline.length > 600 ? "…" : ""}`,
        scorerTopicScore: ts,
      };
    }
    case "writer": {
      const draft = typeof st.draft === "string" ? st.draft : "";
      const max = 12000;
      const clipped =
        draft.length > max ? `${draft.slice(0, max)}\n\n… (tổng ${draft.length} ký tự trong DB)` : draft;
      return {
        label: `Pipeline sau writer · ${t}`,
        displayText: clipped.trim() ? clipped : "(không có draft)",
      };
    }
    case "reviewer": {
      const rsRaw = st.reviewScore;
      const rs = typeof rsRaw === "number" ? rsRaw : Number(rsRaw);
      const reviewScore = Number.isFinite(rs) ? rs : undefined;
      const notes = typeof st.reviewNotes === "string" ? st.reviewNotes : "";
      const risk = st.riskFlag === true || st.riskFlag === false ? st.riskFlag : undefined;
      return {
        label: `Pipeline sau reviewer · ${t}`,
        displayText:
          `reviewScore (đã lưu): ${reviewScore != null ? String(reviewScore) : "—"}\n` +
          `riskFlag: ${risk === true ? "true" : risk === false ? "false" : "—"}\n\n` +
          `reviewNotes:\n${notes || "—"}`,
        reviewerReviewScore: reviewScore,
        reviewerRiskFlag: risk,
      };
    }
    default:
      return null;
  }
}

function parseJsonLoose(raw: string): unknown {
  try {
    return JSON.parse(raw.trim()) as unknown;
  } catch {
    return null;
  }
}

/** Trích số liệu từ output dry-run để đối chiếu pipeline. */
export function parseDryRunStructured(
  agentType: string,
  dryRaw: string
): {
  scorerTopicScore?: number;
  reviewerReviewScore?: number;
  reviewerRisk?: boolean;
  reviewerNotes?: string;
} {
  const out: {
    scorerTopicScore?: number;
    reviewerReviewScore?: number;
    reviewerRisk?: boolean;
    reviewerNotes?: string;
  } = {};
  const j = parseJsonLoose(dryRaw);
  if (!j || typeof j !== "object") return out;
  const o = j as Record<string, unknown>;

  if (agentType === "scorer") {
    const ts = o.topicScore;
    const n = typeof ts === "number" ? ts : Number(ts);
    if (Number.isFinite(n)) out.scorerTopicScore = Math.max(0, Math.min(1, n));
  }
  if (agentType === "reviewer") {
    const rs = o.reviewScore;
    const n = typeof rs === "number" ? rs : Number(rs);
    if (Number.isFinite(n)) out.reviewerReviewScore = Math.max(0, Math.min(1, n));
    if (o.riskFlag === true || o.riskFlag === false) out.reviewerRisk = o.riskFlag;
    if (typeof o.reviewNotes === "string") out.reviewerNotes = o.reviewNotes;
  }
  return out;
}

export type ComparisonHint = { type: "success" | "warning" | "info"; message: string };

/** Gợi ý so sánh ngắn (số điểm, độ dài văn bản, …). */
export function buildComparisonHints(
  agentType: string,
  dryRaw: string,
  baseline: PipelineBaseline | null
): ComparisonHint[] {
  const hints: ComparisonHint[] = [];
  if (!baseline) {
    hints.push({
      type: "warning",
      message:
        "Job chưa có snapshot sau bước này trên pipeline (chưa chạy xong agent hoặc job lỗi trước bước đó) — không có kết quả thật để so.",
    });
    return hints;
  }

  const dry = parseDryRunStructured(agentType, dryRaw);

  if (agentType === "scorer") {
    if (dry.scorerTopicScore != null && baseline.scorerTopicScore != null) {
      const d = Math.abs(dry.scorerTopicScore - baseline.scorerTopicScore);
      hints.push({
        type: d < 0.05 ? "success" : d < 0.2 ? "info" : "warning",
        message: `topicScore dry-run ${dry.scorerTopicScore.toFixed(3)} vs pipeline ${baseline.scorerTopicScore.toFixed(3)} (chênh ${d.toFixed(3)}).`,
      });
    } else if (dry.scorerTopicScore != null) {
      hints.push({ type: "info", message: `Dry-run topicScore = ${dry.scorerTopicScore.toFixed(3)} (pipeline không có số để so).` });
    } else {
      hints.push({
        type: "info",
        message:
          "Không parse được JSON { topicScore } từ dry-run — so sánh tay với khối pipeline bên phải.",
      });
    }
    return hints;
  }

  if (agentType === "reviewer") {
    if (dry.reviewerReviewScore != null && baseline.reviewerReviewScore != null) {
      const d = Math.abs(dry.reviewerReviewScore - baseline.reviewerReviewScore);
      hints.push({
        type: d < 0.05 ? "success" : d < 0.15 ? "info" : "warning",
        message: `reviewScore dry-run ${dry.reviewerReviewScore.toFixed(3)} vs pipeline ${baseline.reviewerReviewScore.toFixed(3)} (chênh ${d.toFixed(3)}).`,
      });
    }
    if (dry.reviewerRisk !== undefined && baseline.reviewerRiskFlag !== undefined) {
      hints.push({
        type: dry.reviewerRisk === baseline.reviewerRiskFlag ? "success" : "warning",
        message: `riskFlag dry-run ${String(dry.reviewerRisk)} vs pipeline ${String(baseline.reviewerRiskFlag)}.`,
      });
    }
    if (!hints.length) {
      hints.push({
        type: "info",
        message: "So khối JSON dry-run với reviewScore / reviewNotes / riskFlag đã lưu bên phải.",
      });
    }
    return hints;
  }

  if (agentType === "planner") {
    const dryTrim = dryRaw.trim();
    const baseOutline = baseline.plannerOutline?.trim() ?? "";
    if (dryTrim && baseOutline) {
      const same = dryTrim === baseOutline;
      hints.push({
        type: same ? "success" : "info",
        message: same
          ? "Chuỗi dry-run trùng hoàn toàn outline đã lưu trên pipeline."
          : `Khác nội dung (dry-run ${dryTrim.length} ký tự vs pipeline outline ${baseOutline.length} ký tự) — thường do prompt/model khác hoặc planner đã chuẩn hoá JSON → outline.`,
      });
    } else {
      hints.push({ type: "info", message: "So sánh trực tiếp hai khối văn bản bên dưới." });
    }
    return hints;
  }

  if (agentType === "writer") {
    const a = dryRaw.trim().length;
    const b = baseline.displayText.trim().length;
    hints.push({
      type: "info",
      message: `Độ dài dry-run ${a} ký tự vs draft pipeline ${b} ký tự (writer không lưu raw LLM riêng — so nội dung tay).`,
    });
    return hints;
  }

  return hints;
}
