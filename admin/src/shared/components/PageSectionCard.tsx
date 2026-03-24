import { Card } from "antd";
import type { ReactNode } from "react";

type PageSectionCardProps = {
  title?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
};

/** Card nội dung thường (mô tả, form, timeline): giữ padding body mặc định. */
export function PageSectionCard({ title, extra, children }: PageSectionCardProps) {
  return (
    <Card title={title} extra={extra}>
      {children}
    </Card>
  );
}
