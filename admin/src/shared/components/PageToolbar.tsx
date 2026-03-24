import { theme } from "antd";
import type { ReactNode } from "react";

type PageToolbarProps = {
  children: ReactNode;
  /**
   * Full width + căn hai đầu: bộ lọc trái, nút phải (tránh `flex: 1` trên form làm khoảng trống giữa chừng).
   */
  spread?: boolean;
};

/** Hàng bộ lọc / thao tụ phụ, căn chỉnh và gap đồng nhất. */
export function PageToolbar({ children, spread }: PageToolbarProps) {
  const { token } = theme.useToken();
  return (
    <div
      className="cc-page-toolbar"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: spread ? "flex-start" : "center",
        gap: token.marginSM,
        ...(spread ? { width: "100%", justifyContent: "space-between" } : {}),
      }}
    >
      {children}
    </div>
  );
}
