import { useState } from "react";
import { Button, Card, List, Space, Table, Tag, Typography, theme } from "antd";
import type { TrendCandidate } from "@/features/ops/models/job";
import { stripHtml } from "@/shared/utils/stripHtml";
import { resolveArticlesForTopic, TopicArticlesBlock } from "@/features/ops/components/TopicArticlesBlock";

const { Text, Paragraph, Title } = Typography;

type Props = {
  candidates: TrendCandidate[];
  rawItemCount?: number;
  /** Gọi với chỉ số candidate (0-based) để chạy pipeline nội dung từ topic đó */
  onRunContentForTopic?: (topicIndex: number) => void;
};

export function TrendCandidatesSection({ candidates, rawItemCount, onRunContentForTopic }: Props) {
  const { token } = theme.useToken();
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(12);

  if (candidates.length === 0) {
    return (
      <Card title="Trend topics">
        <Text type="secondary">Không có topic nào (job chưa xong hoặc không đủ bài đa nguồn).</Text>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card
        title="Tóm tắt trend job"
        styles={{ body: { paddingBottom: 8 } }}
      >
        <Space size="large" wrap>
          <div>
            <Text type="secondary">Số topic / cụm phát hiện</Text>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {candidates.length}
              </Title>
            </div>
          </div>
          {rawItemCount != null && rawItemCount > 0 && (
            <div>
              <Text type="secondary">Bài gửi vào (raw)</Text>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {rawItemCount}
                </Title>
              </div>
            </div>
          )}
          <div>
            <Text type="secondary">Đa nguồn (≥2)</Text>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {candidates.filter((c) => (c.sourceCount ?? 0) >= 2).length}
              </Title>
            </div>
          </div>
        </Space>
      </Card>

      <Card title="Danh sách topic (đọc nhanh)">
        <List
          bordered
          dataSource={candidates}
          pagination={{
            current: listPage,
            pageSize: listPageSize,
            onChange: (p, ps) => {
              setListPage(p);
              setListPageSize(ps);
            },
            showSizeChanger: true,
            pageSizeOptions: [8, 12, 24, 48],
            showTotal: (t) => `${t} topic`,
          }}
          renderItem={(row, index) => (
            <List.Item style={{ alignItems: "flex-start" }}>
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Space wrap align="start">
                  <Tag color="default" style={{ marginInlineEnd: 0 }}>
                    #{(listPage - 1) * listPageSize + index + 1}
                  </Tag>
                  {row.seenBefore ? (
                    <Tag color="orange">Đã thấy (job khác)</Tag>
                  ) : null}
                  <Title
                    level={5}
                    style={{
                      margin: 0,
                      maxWidth: "100%",
                      fontWeight: 600,
                      lineHeight: 1.35,
                    }}
                  >
                    {row.topic}
                  </Title>
                  <Tag color="processing">{row.sourceCount ?? 0} nguồn</Tag>
                </Space>
                <div>
                  {(row.sources ?? []).map((s) => (
                    <Tag key={s} style={{ marginBottom: 4 }}>
                      {s}
                    </Tag>
                  ))}
                </div>
                <Paragraph
                  type="secondary"
                  style={{ marginBottom: 0, fontSize: 13 }}
                  ellipsis={{ rows: 3, expandable: true, symbol: "Xem thêm" }}
                >
                  {stripHtml(row.aggregatedBody ?? "") || "—"}
                </Paragraph>
                <TopicArticlesBlock articles={resolveArticlesForTopic(row)} />
                {onRunContentForTopic ? (
                  <Button
                    type="link"
                    size="small"
                    style={{ paddingLeft: 0 }}
                    onClick={() => onRunContentForTopic((listPage - 1) * listPageSize + index)}
                  >
                    Chạy pipeline nội dung cho topic này
                  </Button>
                ) : null}
              </Space>
            </List.Item>
          )}
        />
      </Card>

      <Card
        title="Chi tiết kỹ thuật (embedding)"
        type="inner"
        styles={{ header: { background: token.colorFillAlter } }}
      >
        <Table<TrendCandidate>
          size="small"
          pagination={{ pageSize: 8, showSizeChanger: true }}
          rowKey={(_, i) => String(i)}
          dataSource={candidates}
          scroll={{ x: 720 }}
          columns={[
            {
              title: "Topic",
              key: "topic",
              width: 220,
              ellipsis: true,
              render: (_, r) => (r.topic ?? "").slice(0, 80) + ((r.topic?.length ?? 0) > 80 ? "…" : ""),
            },
            { title: "Nguồn", key: "sc", width: 72, render: (_, r) => r.sourceCount },
            {
              title: "Model",
              key: "model",
              width: 140,
              ellipsis: true,
              render: (_, r) => r.embeddingModel ?? "—",
            },
            {
              title: "Dims",
              key: "dims",
              width: 56,
              render: (_, r) => r.embeddingDimensions ?? "—",
            },
            {
              title: "Vector preview",
              key: "vec",
              ellipsis: true,
              render: (_, r) => {
                const v = r.topicEmbedding;
                if (!v?.length) return "—";
                const head = v
                  .slice(0, 3)
                  .map((x) => x.toFixed(4))
                  .join(", ");
                return v.length > 3 ? `${head}… (${v.length})` : head;
              },
            },
          ]}
        />
      </Card>
    </Space>
  );
}
