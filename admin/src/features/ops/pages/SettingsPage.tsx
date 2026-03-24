import { Alert, Button, Typography } from "antd";
import { Link } from "react-router-dom";
import { TeamOutlined } from "@ant-design/icons";
import { LangfuseObservabilityCard } from "@/features/ops/components/LangfuseObservabilityCard";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { AppPageHeader } from "@/shared/components/AppPageHeader";
import { PageShell } from "@/shared/components/PageShell";
import { PageSectionCard } from "@/shared/components/PageSectionCard";

const { Paragraph } = Typography;

export default function SettingsPage() {
  useDocumentTitle("Cài đặt");

  return (
    <PageShell>
      <AppPageHeader
        title="Cài đặt"
        description="Quan sát Langfuse và các tùy chọn vận hành. Phiên bản prompt của từng agent được quản lý trong module Agent AI."
      />

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Prompt theo agent (planner, scorer, writer, reviewer)"
        description={
          <>
            <Paragraph style={{ marginBottom: 8 }}>
              Tạo phiên bản, kích hoạt và xem chỉ số từng bước pipeline tại trang quản lý agent — góc nhìn vận hành
              chất lượng / tuning.
            </Paragraph>
            <Link to="/agents">
              <Button type="primary" icon={<TeamOutlined />}>
                Mở Agent AI
              </Button>
            </Link>
          </>
        }
      />

      <PageSectionCard title="Quan sát (Langfuse)">
        <LangfuseObservabilityCard days={7} />
      </PageSectionCard>
    </PageShell>
  );
}
