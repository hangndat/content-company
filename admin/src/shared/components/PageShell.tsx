import { theme } from "antd";
import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
};

/** Khung dọc thống nhất: khoảng cách giữa header / toolbar / nội dung. */
export function PageShell({ children }: PageShellProps) {
  const { token } = theme.useToken();
  return (
    <div
      className="cc-page-shell"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: token.marginLG,
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}
