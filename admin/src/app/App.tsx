import { Suspense } from "react";
import { BrowserRouter, Link, useLocation } from "react-router-dom";
import {
  ProLayout,
  PageContainer,
  ProConfigProvider,
  viVNIntl,
} from "@ant-design/pro-components";
import {
  App as AntdApp,
  ConfigProvider,
  FloatButton,
  theme as antdTheme,
} from "antd";
import type { ThemeConfig } from "antd/es/config-provider/context";
import viVN from "antd/locale/vi_VN";
import { VerticalAlignTopOutlined } from "@ant-design/icons";
import { AppLogo } from "@/shared/components/AppLogo";
import { PageCenteredSpin } from "@/shared/components/PageCenteredSpin";
import { PageShell } from "@/shared/components/PageShell";
import { RouteErrorBoundary } from "@/shared/components/RouteErrorBoundary";
import { OPS_SHELL_PRIMARY, OPS_SHELL_PRIMARY_ACTIVE } from "@/shared/theme/opsShell";
import { OpsMenuFooter, OpsMenuFooterCollapsed, OpsMenuHeader } from "./OpsShellChrome";
import { opsProLayoutRoute, OpsAppRoutes } from "./opsLazyRoutes";

const appTheme: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: OPS_SHELL_PRIMARY,
    colorPrimaryActive: OPS_SHELL_PRIMARY_ACTIVE,
    borderRadius: 8,
    fontSize: 14,
    colorBgLayout: "#f9fafb",
    colorBorderSecondary: "#e5e7eb",
    colorSuccess: "#16a34a",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: {
      bodyBg: "#f9fafb",
      headerBg: "#f9fafb",
      siderBg: "#ffffff",
    },
    Card: {
      headerFontSize: 15,
      paddingLG: 20,
    },
    Table: {
      headerBg: "#fafafa",
      borderColor: "#f0f0f0",
    },
    Menu: {
      itemBorderRadius: 8,
      itemMarginInline: 4,
      itemHeight: 40,
      iconSize: 16,
      collapsedIconSize: 16,
      itemSelectedBg: "rgba(124, 58, 237, 0.09)",
      itemSelectedColor: OPS_SHELL_PRIMARY_ACTIVE,
      itemHoverBg: "rgba(124, 58, 237, 0.05)",
      subMenuItemBorderRadius: 8,
    },
    Segmented: {
      trackBg: "rgba(0,0,0,0.04)",
    },
  },
};

function LayoutContent() {
  const location = useLocation();

  return (
    <>
      <ProLayout
        title={false}
        logo={<AppLogo />}
        layout="side"
        fixedHeader
        fixSiderbar
        siderWidth={260}
        location={{ pathname: location.pathname }}
        route={opsProLayoutRoute}
        contentStyle={{
          margin: 0,
          minHeight: "calc(100vh - 56px)",
          background: "#f9fafb",
        }}
        menu={{ collapsedShowTitle: false, type: "sub" }}
        menuHeaderRender={(logo, _title, props) =>
          props?.collapsed ? (
            <div className="cc-sider-header-collapsed">{logo}</div>
          ) : (
            <OpsMenuHeader logo={logo} />
          )
        }
        menuFooterRender={(props) => (props?.collapsed ? <OpsMenuFooterCollapsed /> : <OpsMenuFooter />)}
        menuItemRender={(item, dom) => {
          if (item.path && !item.isUrl) {
            return <Link to={item.path}>{dom}</Link>;
          }
          return dom;
        }}
        subMenuItemRender={(_, dom) => dom}
        actionsRender={() => []}
        footerRender={false}
      >
        <PageContainer fixHeader pageHeaderRender={false} className="app-page-container">
          <div className="cc-main-content-surface">
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
          </div>
        </PageContainer>
      </ProLayout>
      <FloatButton.BackTop type="default" icon={<VerticalAlignTopOutlined />} />
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
