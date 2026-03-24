import type { GraphState } from "../types.js";
import { decide } from "../routing.js";

export function decisionNode(state: GraphState): Partial<GraphState> {
  const decision = decide(state);
  return { decision };
}
