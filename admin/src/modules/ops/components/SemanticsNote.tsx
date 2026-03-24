import { Alert, Typography } from "antd";
import { semanticsToItems, type Semantics } from "../../../shared/utils/semantics";

interface SemanticsNoteProps {
  semantics: Semantics | null | undefined;
  variant?: "alert" | "text";
}

export function SemanticsNote({ semantics, variant = "alert" }: SemanticsNoteProps) {
  const items = semanticsToItems(semantics);
  if (items.length === 0) return null;

  const content = items.map((i) => `${i.key}: ${i.value}`).join(" · ");

  if (variant === "text") {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {content}
      </Typography.Text>
    );
  }

  return (
    <Alert
      type="info"
      showIcon
      message="Semantics"
      description={content}
      style={{ marginBottom: 16 }}
    />
  );
}
