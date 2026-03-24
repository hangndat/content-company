import { Suspense, useState } from "react";
import { BrowserRouter, Link, useLocation } from "react-router-dom";
import {
  ProLayout,
  PageContainer,
  ProConfigProvider,
  viVNIntl,
} from "@ant-design/pro-components";
import {
  App as AntdApp,
  Button,
  ConfigProvider,
  FloatButton,
  Grid,
  Space,
  Tooltip,
  theme as antdTheme,
} from "antd";
import type { ThemeConfig } from "antd/es/config-provider/context";
import viVN from "antd/locale/vi_VN";
import { ThunderboltOutlined, VerticalAlignTopOutlined } from "@ant-design/icons";
import { RunJobModal } from "@/features/ops/components/RunJobModal";
import { RunTrendJobModal } from "@/features/ops/components/RunTrendJobModal";
import { AppLogo } from "@/shared/components/AppLogo";
import { PageCenteredSpin } from "@/shared/components/PageCenteredSpin";
import { PageShell } from "@/shared/components/PageShell";
import { RouteErrorBoundary } from "@/shared/components/RouteErrorBoundary";
import { opsProLayoutRoute, OpsAppRoutes } from "./opsLazyRoutes";

const appTheme: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: "#1677ff",
    borderRadius: 8,
    fontSize: 14,
    colorBgLayout: "#f0f2f5",
    colorSuccess: "#52c41a",
    colorWarning: "#faad14",
    colorError: "#ff4d4f",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
  },
  components: {
    Layout: {
      bodyBg: "#f0f2f5",
      headerBg: "#fff",
      siderBg: "#fff",
    },
    Card: {
      headerFontSize: 15,
    },
    Table: {
      headerBg: "#fafafa",
    },
    Menu: {
      itemBorderRadius: 6,
    },
  },
};

function LayoutContent() {
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  /** ProLayout header right area is tight; long labels overflow below md (~768px). */
  const compactHeaderActions = screens.md !== true;
  const [runJobModalOpen, setRunJobModalOpen] = useState(false);
  const [runTrendModalOpen, setRunTrendModalOpen] = useState(false);

  const runPipelineButton = compactHeaderActions ? (
    <Tooltip title="Chạy pipeline nội dung">
      <Button
        type="primary"
        icon={<ThunderboltOutlined />}
        onClick={() => setRunJobModalOpen(true)}
        aria-label="Chạy pipeline nội dung"
      />
    </Tooltip>
  ) : (
    <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => setRunJobModalOpen(true)}>
      Chạy pipeline nội dung
    </Button>
  );

  const runTrendButton = compactHeaderActions ? (
    <Tooltip title="Chạy trend">
      <Button
        icon={<ThunderboltOutlined />}
        onClick={() => setRunTrendModalOpen(true)}
        aria-label="Chạy trend"
      />
    </Tooltip>
  ) : (
    <Button icon={<ThunderboltOutlined />} onClick={() => setRunTrendModalOpen(true)}>
      Chạy trend
    </Button>
  );

  return (
    <>
      <ProLayout
        title="Vận hành nội dung"
        logo={<AppLogo />}
        layout="mix"
        fixedHeader
        fixSiderbar
        location={{ pathname: location.pathname }}
        route={opsProLayoutRoute}
        contentStyle={{ margin: 0, minHeight: "calc(100vh - 56px)" }}
        menu={{ collapsedShowTitle: true }}
        menuItemRender={(item, dom) => {
          if (item.path && !item.isUrl) {
            return <Link to={item.path}>{dom}</Link>;
          }
          return dom;
        }}
        subMenuItemRender={(_, dom) => dom}
        avatarProps={{
          src: undefined,
          title: "Quản trị",
        }}
        actionsRender={() => [
          <Space key="run-actions" size={compactHeaderActions ? 6 : "small"} wrap className="app-header-run-actions">
            {runPipelineButton}
            {runTrendButton}
          </Space>,
        ]}
        footerRender={() => (
          <div
            style={{
              textAlign: "center",
              padding: "12px 16px",
              fontSize: 12,
              color: "rgba(0,0,0,0.45)",
            }}
          >
            Content Company — điều khiển pipeline AI, hàng đợi BullMQ và dữ liệu vận hành.
          </div>
        )}
      >
        <PageContainer fixHeader pageHeaderRender={false} className="app-page-container">
          <RouteErrorBoundary>
            <Suspense
              fallback={
                <PageShell>
                  <PageCenteredSpin tip="Đang tải trang…" />
                </PageShell>
              }
            >
              <OpsAppRoutes />
            </Suspense>
          </RouteErrorBoundary>
        </PageContainer>
      </ProLayout>
      <FloatButton.BackTop type="default" icon={<VerticalAlignTopOutlined />} />
      <RunJobModal open={runJobModalOpen} onClose={() => setRunJobModalOpen(false)} />
      <RunTrendJobModal open={runTrendModalOpen} onClose={() => setRunTrendModalOpen(false)} />
    </>
  );
}

function App() {
  return (
    <ConfigProvider locale={viVN} theme={appTheme}>
      <AntdApp>
        <ProConfigProvider token={appTheme.token} intl={viVNIntl}>
          <BrowserRouter>
            <LayoutContent />
          </BrowserRouter>
        </ProConfigProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
