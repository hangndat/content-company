import { Card, Tag } from "antd";
import type { WinnerSuggestion } from "../models/experiment";
import { GuardResultTag } from "./GuardResultTag";

interface WinnerSuggestionCardProps {
  winner: WinnerSuggestion;
  sampleSufficient?: boolean;
  guardResults?: { passesSample: boolean; passesApproveRate: boolean; passesReviewScore: boolean };
}

export function WinnerSuggestionCard({
  winner,
  sampleSufficient,
  guardResults,
}: WinnerSuggestionCardProps) {
  const { guards } = winner;

  return (
    <Card
      title="Winner Suggestion"
      style={{ borderColor: "#52c41a", borderWidth: 2 }}
    >
      <p>
        <Tag color="gold">{winner.name}</Tag> — metric: {winner.metric}
      </p>
      {guards && (
        <p style={{ marginBottom: 8 }}>
          Guards: minSample={guards.minSample ?? "—"}, maxApproveRateDrop=
          {guards.maxApproveRateDrop != null ? `${(guards.maxApproveRateDrop * 100).toFixed(0)}%` : "—"}, maxReviewScoreDrop=
          {guards.maxReviewScoreDrop ?? "—"}
        </p>
      )}
      {sampleSufficient !== undefined && (
        <p>
          <GuardResultTag passes={sampleSufficient} label={sampleSufficient ? "Sample sufficient" : "Sample insufficient"} />
        </p>
      )}
      {guardResults && (
        <p>
          Sample: <GuardResultTag passes={guardResults.passesSample} />{" "}
          Approve rate: <GuardResultTag passes={guardResults.passesApproveRate} />{" "}
          Review score: <GuardResultTag passes={guardResults.passesReviewScore} />
        </p>
      )}
    </Card>
  );
}
