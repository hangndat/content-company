import { Typography } from "antd";
import type { TrendCandidate, TrendSourceArticle } from "@/features/ops/models/job";

const { Text } = Typography;

/** Chuẩn hoá danh sách bài hiển thị từ candidate (job mới có sourceArticles; job cũ chỉ itemRefs). */
export function resolveArticlesForTopic(
  candidate: Pick<TrendCandidate, "sourceArticles" | "itemRefs"> | null | undefined
): TrendSourceArticle[] {
  if (!candidate) return [];
  if (candidate.sourceArticles && candidate.sourceArticles.length > 0) {
    return candidate.sourceArticles;
  }
  return (candidate.itemRefs ?? []).map((url) => ({ title: url, url }));
}

type Props = {
  articles: TrendSourceArticle[];
  /** Mặc định: "Bài trong topic" */
  heading?: string;
};

export function TopicArticlesBlock({ articles, heading = "Bài trong topic" }: Props) {
  if (articles.length === 0) return null;
  return (
    <div>
      <Text strong style={{ fontSize: 12 }}>
        {heading} ({articles.length})
      </Text>
      <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13 }}>
        {articles.map((a, i) => (
          <li key={`${a.url ?? ""}-${i}`} style={{ marginBottom: 4 }}>
            {a.url ? (
              <a href={a.url} target="_blank" rel="noreferrer" title={a.title}>
                {a.title}
              </a>
            ) : (
              <span>{a.title}</span>
            )}
            {a.url ? (
              <Text type="secondary" style={{ marginLeft: 6, fontSize: 11 }}>
                ({hostnameLabel(a.url)})
              </Text>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function hostnameLabel(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return h.length > 28 ? `${h.slice(0, 26)}…` : h;
  } catch {
    return "link";
  }
}
