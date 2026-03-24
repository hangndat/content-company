import { theme } from "antd";
import type { ReactNode } from "react";

type PageToolbarProps = {
  children: ReactNode;
};

/** Hàng bộ lọc / thao tụ phụ, căn chỉnh và gap đồng nhất. */
export function PageToolbar({ children }: PageToolbarProps) {
  const { token } = theme.useToken();
  return (
    <div
      className="cc-page-toolbar"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: token.marginSM,
      }}
    >
      {children}
    </div>
  );
}
