import type { GraphState } from "./types.js";
import { DECISION, PUBLISH_POLICY, THRESHOLDS } from "../config/constants.js";

export function decide(state: GraphState): string {
  if (state.publishPolicy === PUBLISH_POLICY.REVIEW_ONLY) {
    return DECISION.REVIEW_REQUIRED;
  }
  if (state.publishPolicy === PUBLISH_POLICY.MANUAL_ONLY) {
    return DECISION.REVIEW_REQUIRED;
  }

  const topicScore = state.topicScore ?? 0;
  const reviewScore = state.reviewScore ?? 0;
  const retryCount = state.retryCount ?? 0;
  const riskFlag = state.riskFlag ?? false;

  if (topicScore < THRESHOLDS.TOPIC_SCORE_REJECT) {
    return DECISION.REJECTED;
  }
  if (topicScore >= THRESHOLDS.TOPIC_SCORE_REJECT && reviewScore < THRESHOLDS.REVIEW_SCORE_REJECT) {
    return DECISION.REJECTED;
  }
  if (retryCount >= THRESHOLDS.MAX_RETRY && reviewScore < THRESHOLDS.REVIEW_SCORE_APPROVE) {
    return DECISION.REJECTED;
  }
  if (riskFlag) {
    return DECISION.REVIEW_REQUIRED;
  }
  if (
    topicScore >= THRESHOLDS.TOPIC_SCORE_APPROVE &&
    reviewScore >= THRESHOLDS.REVIEW_SCORE_APPROVE
  ) {
    return DECISION.APPROVED;
  }

  return DECISION.REVIEW_REQUIRED;
}
