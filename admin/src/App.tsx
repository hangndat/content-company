import { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import {
  ProLayout,
  PageContainer,
  ProConfigProvider,
  enUSIntl,
} from "@ant-design/pro-components";
import { App as AntdApp, Button, ConfigProvider, Space } from "antd";
import {
  DashboardOutlined,
  ExperimentOutlined,
  UnorderedListOutlined,
  SendOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import OpsDashboardPage from "./modules/ops/pages/OpsDashboardPage";
import ExperimentsPage from "./modules/ops/pages/ExperimentsPage";
import ExperimentDetailPage from "./modules/ops/pages/ExperimentDetailPage";
import JobsListPage from "./modules/ops/pages/JobsListPage";
import JobDetailPage from "./modules/ops/pages/JobDetailPage";
import PostsPage from "./modules/ops/pages/PostsPage";
import SettingsPage from "./modules/ops/pages/SettingsPage";
import { RunJobModal } from "./modules/ops/components/RunJobModal";
import { RunTrendJobModal } from "./modules/ops/components/RunTrendJobModal";

const route = {
  path: "/",
  routes: [
    { path: "/", name: "Overview", icon: <DashboardOutlined /> },
    { path: "/jobs", name: "Jobs", icon: <UnorderedListOutlined /> },
    { path: "/posts", name: "Posts", icon: <SendOutlined /> },
    { path: "/experiments", name: "Experiments", icon: <ExperimentOutlined /> },
    { path: "/settings", name: "Settings", icon: <SettingOutlined /> },
  ],
};

function LayoutContent() {
  const location = useLocation();
  const [runJobModalOpen, setRunJobModalOpen] = useState(false);
  const [runTrendModalOpen, setRunTrendModalOpen] = useState(false);

  return (
    <>
      <ProLayout
        title="Ops Dashboard"
        logo={<span style={{ fontSize: 24 }}>📊</span>}
        layout="mix"
        fixedHeader
        fixSiderbar
        location={{ pathname: location.pathname }}
        route={route}
        menuItemRender={(item, dom) => {
          if (item.path && !item.isUrl) {
            return <Link to={item.path}>{dom}</Link>;
          }
          return dom;
        }}
        subMenuItemRender={(_, dom) => dom}
        avatarProps={{
          src: undefined,
          title: "Admin",
        }}
        actionsRender={() => [
          <Space key="run-actions" size="small">
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => setRunJobModalOpen(true)}>
              Run content
            </Button>
            <Button icon={<ThunderboltOutlined />} onClick={() => setRunTrendModalOpen(true)}>
              Run trend
            </Button>
          </Space>,
        ]}
        menu={{ collapsedShowTitle: true }}
      >
      <PageContainer fixHeader pageHeaderRender={false}>
        <Routes>
          <Route path="/" element={<OpsDashboardPage />} />
          <Route path="/jobs" element={<JobsListPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/experiments" element={<ExperimentsPage />} />
          <Route path="/experiments/:id" element={<ExperimentDetailPage />} />
          <Route path="/posts" element={<PostsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </PageContainer>
    </ProLayout>
      <RunJobModal open={runJobModalOpen} onClose={() => setRunJobModalOpen(false)} />
      <RunTrendJobModal open={runTrendModalOpen} onClose={() => setRunTrendModalOpen(false)} />
    </>
  );
}

const theme = {
  token: {
    colorPrimary: "#1890ff",
    borderRadius: 6,
  },
};

function App() {
  return (
    <ConfigProvider theme={theme}>
      <AntdApp>
        <ProConfigProvider token={theme.token} intl={enUSIntl}>
          <BrowserRouter>
            <LayoutContent />
          </BrowserRouter>
        </ProConfigProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
