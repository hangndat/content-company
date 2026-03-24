/** Pipeline agent ids — must match orchestrator NODE_TYPES / PromptVersion.type */
export const AGENT_TYPES = ["planner", "scorer", "writer", "reviewer"] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

export type AgentDefinition = {
  id: AgentType;
  nameVi: string;
  description: string;
  /** Placeholders substituted in orchestrator getPrompt() */
  placeholders: string[];
};

export const AGENTS: readonly AgentDefinition[] = [
  {
    id: "planner",
    nameVi: "Lập kế hoạch",
    description:
      "Đọc nguồn đầu vào, rút chủ đề và dàn ý ngắn cho pipeline. Đầu ra JSON: topic, outline.",
    placeholders: ["SOURCE_ITEMS"],
  },
  {
    id: "scorer",
    nameVi: "Chấm điểm cơ hội",
    description:
      "Đánh giá mức độ đáng đăng của chủ đề (0–1). Có thể nhận thêm ngữ cảnh phản hồi. Đầu ra JSON: topicScore.",
    placeholders: ["OUTLINE", "FEEDBACK_SECTION"],
  },
  {
    id: "writer",
    nameVi: "Viết bài",
    description: "Soạn bản nháp markdown từ dàn ý và tóm tắt nguồn (300–500 từ).",
    placeholders: ["OUTLINE", "SOURCE_SUMMARY"],
  },
  {
    id: "reviewer",
    nameVi: "Kiểm duyệt chất lượng",
    description:
      "Chấm chất lượng bản nháp, ghi chú và cờ rủi ro. Đầu ra JSON: reviewScore, reviewNotes, riskFlag.",
    placeholders: ["DRAFT"],
  },
] as const;

export function isAgentType(s: string): s is AgentType {
  return (AGENT_TYPES as readonly string[]).includes(s);
}

export function getAgent(id: string): AgentDefinition | undefined {
  return AGENTS.find((a) => a.id === id);
}
