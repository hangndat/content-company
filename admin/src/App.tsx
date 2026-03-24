import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Layout, Menu } from "antd";
import { DashboardOutlined, ExperimentOutlined, UnorderedListOutlined } from "@ant-design/icons";
import OpsDashboardPage from "./modules/ops/pages/OpsDashboardPage";
import ExperimentsPage from "./modules/ops/pages/ExperimentsPage";
import ExperimentDetailPage from "./modules/ops/pages/ExperimentDetailPage";
import JobsListPage from "./modules/ops/pages/JobsListPage";
import JobDetailPage from "./modules/ops/pages/JobDetailPage";

const { Header, Content } = Layout;

function App() {
  const location = useLocation();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ color: "white", fontWeight: 600, fontSize: 18 }}>
          Ops Dashboard
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[
            location.pathname === "/" ? "/" :
            location.pathname.startsWith("/jobs") ? "/jobs" :
            location.pathname.startsWith("/experiments") ? "/experiments" :
            location.pathname,
          ]}
          style={{ flex: 1, minWidth: 0 }}
          items={[
            { key: "/", icon: <DashboardOutlined />, label: <Link to="/">Overview</Link> },
            {
              key: "/jobs",
              icon: <UnorderedListOutlined />,
              label: <Link to="/jobs">Jobs</Link>,
            },
            {
              key: "/experiments",
              icon: <ExperimentOutlined />,
              label: <Link to="/experiments">Experiments</Link>,
            },
          ]}
        />
      </Header>
      <Content style={{ padding: 24 }}>
        <Routes>
          <Route path="/" element={<OpsDashboardPage />} />
          <Route path="/jobs" element={<JobsListPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/experiments" element={<ExperimentsPage />} />
          <Route path="/experiments/:id" element={<ExperimentDetailPage />} />
        </Routes>
      </Content>
    </Layout>
  );
}

export default App;
