import { Tag } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";

interface GuardResultTagProps {
  passes: boolean;
  label?: string;
}

export function GuardResultTag({ passes, label }: GuardResultTagProps) {
  const Icon = passes ? CheckCircleOutlined : CloseCircleOutlined;
  const color = passes ? "success" : "error";
  const text = label ?? (passes ? "Pass" : "Fail");

  return (
    <Tag icon={<Icon />} color={color}>
      {text}
    </Tag>
  );
}
