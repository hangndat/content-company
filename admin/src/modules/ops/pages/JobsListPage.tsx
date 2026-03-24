import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Table, Alert, Select, Tag } from "antd";
import { jobService } from "../services/jobService";
import type { JobListItem } from "../models/job";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export default function JobsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await jobService.listJobs({ limit: 50, offset: 0, status: status || undefined });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      title: "Job ID",
      dataIndex: "id",
      key: "id",
      render: (id: string) => (
        <a onClick={() => navigate(`/jobs/${id}`)} style={{ cursor: "pointer" }}>
          {id.slice(0, 8)}…
        </a>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
    },
    {
      title: "Decision",
      dataIndex: "decision",
      key: "decision",
    },
    {
      title: "Source",
      dataIndex: "sourceType",
      key: "sourceType",
      render: (t: string) =>
        t === "trend_aggregate" ? <Tag color="purple">trend</Tag> : <Tag>{t}</Tag>,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => (v ? new Date(v).toLocaleString() : "—"),
    },
    {
      title: "Completed",
      dataIndex: "completedAt",
      key: "completedAt",
      render: (v: string) => (v ? new Date(v).toLocaleString() : "—"),
    },
  ];

  if (error) {
    return (
      <Alert
        type="error"
        message={error}
        showIcon
        action={
          <a onClick={load} style={{ marginLeft: 8 }}>
            Retry
          </a>
        }
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Jobs</h2>
        <Select
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          style={{ width: 140 }}
        />
      </div>
      <Card>
        <Table
          dataSource={items}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}
