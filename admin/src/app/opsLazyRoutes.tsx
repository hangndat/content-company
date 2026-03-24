import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import {
  DashboardOutlined,
  ExperimentOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  SendOutlined,
  SettingOutlined,
} from "@ant-design/icons";

export type OpsNavItem = {
  path: string;
  name: string;
  icon: ReactNode;
};

/** Top-level ops sidebar: single source of truth for ProLayout menu paths and labels. */
export const OPS_NAV_ITEMS: OpsNavItem[] = [
  { path: "/", name: "Tổng quan", icon: <DashboardOutlined /> },
  { path: "/jobs", name: "Job", icon: <UnorderedListOutlined /> },
  { path: "/posts", name: "Bài đăng", icon: <SendOutlined /> },
  { path: "/experiments", name: "Thử nghiệm", icon: <ExperimentOutlined /> },
  { path: "/agents", name: "Agent AI", icon: <TeamOutlined /> },
  { path: "/settings", name: "Cài đặt", icon: <SettingOutlined /> },
];

export const opsProLayoutRoute = {
  path: "/",
  routes: OPS_NAV_ITEMS.map(({ path, name, icon }) => ({ path, name, icon })),
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

export function OpsAppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LazyOpsDashboardPage />} />
      <Route path="/jobs" element={<LazyJobsListPage />} />
      <Route path="/jobs/:id" element={<LazyJobDetailPage />} />
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
