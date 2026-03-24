import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ExperimentArmReport } from "@/features/ops/models/experiment";
import {
  formatPercentShort,
  formatPercent,
  formatReviewScore,
  formatLargeNumber,
} from "@/shared/utils/formatters";
import { GuardResultTag } from "./GuardResultTag";

interface ExperimentArmsTableProps {
  dataSource: ExperimentArmReport[];
  loading?: boolean;
}

function GuardResultsCell({ g }: { g: ExperimentArmReport["guardResults"] }) {
  if (!g) return "—";
  return (
    <span>
      Sample: <GuardResultTag passes={g.passesSample} />{" "}
      Approve: <GuardResultTag passes={g.passesApproveRate} />{" "}
      Review: <GuardResultTag passes={g.passesReviewScore} />
    </span>
  );
}

export function ExperimentArmsTable({ dataSource, loading }: ExperimentArmsTableProps) {
  const columns: ColumnsType<ExperimentArmReport> = [
    { title: "Arm", dataIndex: "name", key: "name", width: 120 },
    { title: "Prompt Type", dataIndex: "promptType", key: "promptType", width: 100 },
    { title: "Version", dataIndex: "promptVersion", key: "promptVersion", width: 80 },
    {
      title: "Jobs",
      dataIndex: "jobsCount",
      key: "jobsCount",
      width: 80,
      render: (v) => formatLargeNumber(v),
    },
    {
      title: "Approve Rate",
      dataIndex: "approveRate",
      key: "approveRate",
      width: 110,
      render: (v) => formatPercentShort(v),
    },
    {
      title: "Review Req.",
      dataIndex: "reviewRequiredCount",
      key: "reviewRequiredCount",
      width: 90,
      render: (_, r) => formatPercentShort(r.jobsCount ? r.reviewRequiredCount / r.jobsCount : null),
    },
    {
      title: "Reject Rate",
      key: "rejectRate",
      width: 100,
      render: (_, r) =>
        formatPercentShort(r.jobsCount ? r.rejectedCount / r.jobsCount : null),
    },
    {
      title: "Impressions",
      dataIndex: "impressions",
      key: "impressions",
      width: 100,
      render: (val) => formatLargeNumber(val),
    },
    {
      title: "Views",
      dataIndex: "views",
      key: "views",
      width: 80,
      render: (v) => formatLargeNumber(v),
    },
    {
      title: "Clicks",
      dataIndex: "clicks",
      key: "clicks",
      width: 80,
      render: (v) => formatLargeNumber(v),
    },
    {
      title: "Smoothed CTR",
      dataIndex: "smoothedCtr",
      key: "smoothedCtr",
      width: 110,
      render: (v) => formatPercent(v),
    },
    {
      title: "Avg Review",
      dataIndex: "avgReviewScore",
      key: "avgReviewScore",
      width: 100,
      render: (v) => formatReviewScore(v),
    },
    {
      title: "Sample",
      dataIndex: "sampleCount",
      key: "sampleCount",
      width: 80,
      render: (v) => formatLargeNumber(v),
    },
    {
      title: "Guards",
      key: "guardResults",
      width: 200,
      render: (_, r) => <GuardResultsCell g={r.guardResults} />,
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      rowKey="armId"
      size="small"
      pagination={false}
      loading={loading}
      locale={{ emptyText: "No arms data" }}
    />
  );
}
