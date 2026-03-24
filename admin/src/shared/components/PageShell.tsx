import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
};

/** Khung dọc thống nhất: khoảng cách giữa header / toolbar / nội dung (CSS: `.cc-page-shell`). */
export function PageShell({ children }: PageShellProps) {
  return <div className="cc-page-shell">{children}</div>;
}
