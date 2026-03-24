import { Card } from "antd";
import type { ReactNode } from "react";

type PageTableCardProps = {
  title?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
};

/** Card chứa bảng: body không padding để bảng full width. */
export function PageTableCard({ title, extra, children }: PageTableCardProps) {
  return (
    <Card title={title} extra={extra} styles={{ body: { padding: 0 } }}>
      {children}
    </Card>
  );
}
