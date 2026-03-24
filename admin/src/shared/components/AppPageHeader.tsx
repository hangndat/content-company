import { Typography, theme } from "antd";
import type { ReactNode } from "react";

const { Title, Text } = Typography;

interface AppPageHeaderProps {
  title: string;
  description?: string;
  /** Nút làm mới, v.v. — căn phải trên desktop, xuống dòng trên mobile. */
  extra?: ReactNode;
}

export function AppPageHeader({ title, description, extra }: AppPageHeaderProps) {
  const { token } = theme.useToken();

  return (
    <header style={{ marginBottom: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: token.marginMD,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <Title level={3} style={{ marginBottom: description ? token.marginXS : 0 }}>
            {title}
          </Title>
          {description ? (
            <Text type="secondary" style={{ display: "block", maxWidth: 720, lineHeight: 1.6 }}>
              {description}
            </Text>
          ) : null}
        </div>
        {extra ? <div style={{ flexShrink: 0, paddingTop: 2 }}>{extra}</div> : null}
      </div>
    </header>
  );
}
