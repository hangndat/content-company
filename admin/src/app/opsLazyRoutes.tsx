import { lazy } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import {
  AppstoreOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  SendOutlined,
  TagsOutlined,
  LineChartOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  GlobalOutlined,
  RocketOutlined,
} from "@ant-design/icons";

/**
 * Sidebar nhóm theo nghiệp vụ (kiểu Langfuse).
 * Cài đặt nằm ở footer sidebar (OpsMenuFooter), không lặp trong menu chính.
 */
export const opsProLayoutRoute = {
  path: "/",
  routes: [
    { path: "/", name: "Tổng quan", icon: <DashboardOutlined /> },
    {
      path: "/ops",
      name: "Vận hành",
      icon: <AppstoreOutlined />,
      routes: [
        { path: "/jobs", name: "Job", icon: <UnorderedListOutlined /> },
        { path: "/content-drafts", name: "Draft nội dung", icon: <FileTextOutlined /> },
        { path: "/posts", name: "Bài đăng", icon: <SendOutlined /> },
        {
          path: "/trend-crawl",
          name: "Trend & crawl",
          icon: <LineChartOutlined />,
          routes: [
            { path: "/trend-sources", name: "Nguồn RSS", icon: <GlobalOutlined /> },
            { path: "/crawled-articles", name: "Bài đã crawl", icon: <FileSearchOutlined /> },
            { path: "/trend-topics", name: "Thư viện topic", icon: <TagsOutlined /> },
          ],
        },
      ],
    },
    {
      path: "/quality",
      name: "Thử nghiệm & AI",
      icon: <RocketOutlined />,
      routes: [
        { path: "/experiments", name: "Thử nghiệm", icon: <ExperimentOutlined /> },
        { path: "/agents", name: "Agent AI", icon: <TeamOutlined /> },
      ],
    },
  ],
};

export const LazyOpsDashboardPage = lazy(() => import("@/features/ops/pages/OpsDashboardPage"));
export const LazyJobsListPage = lazy(() => import("@/features/ops/pages/JobsListPage"));
export const LazyJobDetailPage = lazy(() => import("@/features/ops/pages/JobDetailPage"));
export const LazyExperimentsPage = lazy(() => import("@/features/ops/pages/ExperimentsPage"));
export const LazyExperimentDetailPage = lazy(() => import("@/features/ops/pages/ExperimentDetailPage"));
export const LazyPostsPage = lazy(() => import("@/features/ops/pages/PostsPage"));
export const LazyAgentsListPage = lazy(() => import("@/features/ops/pages/AgentsListPage"));
export const LazyAgentDetailPage = lazy(() => import("@/features/ops/pages/AgentDetailPage"));
export const LazyPromptTuningPage = lazy(() => import("@/features/ops/pages/PromptTuningPage"));
export const LazySettingsPage = lazy(() => import("@/features/ops/pages/SettingsPage"));
export const LazyTrendTopicsPage = lazy(() => import("@/features/ops/pages/TrendTopicsPage"));
export const LazyTrendTopicDetailPage = lazy(() => import("@/features/ops/pages/TrendTopicDetailPage"));
export const LazyCrawledArticlesPage = lazy(() => import("@/features/ops/pages/CrawledArticlesPage"));
export const LazyTrendSourcesPage = lazy(() => import("@/features/ops/pages/TrendSourcesPage"));
export const LazyContentDraftsPage = lazy(() => import("@/features/ops/pages/ContentDraftsPage"));

export function OpsAppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LazyOpsDashboardPage />} />
      <Route path="/ops" element={<Navigate to="/jobs" replace />} />
      <Route path="/quality" element={<Navigate to="/experiments" replace />} />
      <Route path="/jobs" element={<LazyJobsListPage />} />
      <Route path="/jobs/:id" element={<LazyJobDetailPage />} />
      <Route path="/content-drafts" element={<LazyContentDraftsPage />} />
      <Route path="/trend-crawl" element={<Navigate to="/crawled-articles" replace />} />
      <Route path="/trend-sources" element={<LazyTrendSourcesPage />} />
      <Route path="/crawled-articles" element={<LazyCrawledArticlesPage />} />
      <Route path="/trend-topics/:id" element={<LazyTrendTopicDetailPage />} />
      <Route path="/trend-topics" element={<LazyTrendTopicsPage />} />
      <Route path="/experiments" element={<LazyExperimentsPage />} />
      <Route path="/experiments/:id" element={<LazyExperimentDetailPage />} />
      <Route path="/posts" element={<LazyPostsPage />} />
      <Route path="/agents" element={<LazyAgentsListPage />} />
      <Route path="/agents/:type/tune" element={<LazyPromptTuningPage />} />
      <Route path="/agents/:type" element={<LazyAgentDetailPage />} />
      <Route path="/settings" element={<LazySettingsPage />} />
    </Routes>
  );
}
