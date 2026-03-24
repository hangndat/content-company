import { type CSSProperties } from "react";
import { NavLink } from "react-router-dom";
import { Avatar, Button, Tooltip, Typography } from "antd";
import { ExportOutlined, SettingOutlined } from "@ant-design/icons";
import { OPS_SHELL_PRIMARY } from "@/shared/theme/opsShell";

type MenuHeaderProps = {
  logo: React.ReactNode;
};

export function OpsMenuHeader({ logo }: MenuHeaderProps) {
  return (
    <div style={{ padding: "12px 12px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {logo}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.25, letterSpacing: -0.02 }}>
            Content Company
          </div>
        </div>
      </div>
    </div>
  );
}

const footerLinkStyle: CSSProperties = {
  display: "block",
  fontSize: 13,
  padding: "4px 0",
  color: "rgba(0, 0, 0, 0.65)",
  textDecoration: "none",
};

export function OpsMenuFooterCollapsed() {
  return (
    <div className="cc-sider-footer-collapsed">
      <Tooltip title="Cài đặt" placement="right">
        <NavLink to="/settings" className="cc-sider-icon-link">
          <Button type="text" icon={<SettingOutlined style={{ fontSize: 18 }} />} aria-label="Cài đặt" />
        </NavLink>
      </Tooltip>
      <Tooltip title="Tài liệu Langfuse" placement="right">
        <a
          href="https://langfuse.com/docs"
          target="_blank"
          rel="noreferrer"
          className="cc-sider-icon-link"
          aria-label="Tài liệu Langfuse"
        >
          <Button type="text" icon={<ExportOutlined style={{ fontSize: 18 }} />} />
        </a>
      </Tooltip>
      <Tooltip title="Quản trị · ops@local" placement="right">
        <Avatar style={{ background: OPS_SHELL_PRIMARY, cursor: "default" }}>Q</Avatar>
      </Tooltip>
    </div>
  );
}

export function OpsMenuFooter() {
  return (
    <div
      className="cc-sider-footer-expanded"
      style={{
        padding: "12px 12px 16px",
        borderTop: "1px solid rgba(0, 0, 0, 0.06)",
        marginTop: "auto",
      }}
    >
      <NavLink
        to="/settings"
        style={({ isActive }) => ({
          ...footerLinkStyle,
          color: isActive ? OPS_SHELL_PRIMARY : "rgba(0, 0, 0, 0.65)",
          fontWeight: isActive ? 600 : 400,
        })}
      >
        Cài đặt
      </NavLink>
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid rgba(0, 0, 0, 0.06)",
        }}
      >
        <Avatar style={{ background: OPS_SHELL_PRIMARY, flexShrink: 0 }}>Q</Avatar>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 13, lineHeight: 1.3 }}>Quản trị</div>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }} ellipsis>
            ops@local
          </Typography.Text>
        </div>
      </div>
    </div>
  );
}
