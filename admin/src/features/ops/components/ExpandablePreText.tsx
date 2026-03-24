import { useState } from "react";
import { Button, Typography } from "antd";

const { Paragraph } = Typography;

type Props = {
  text: string;
  /** Số ký tự khi thu gọn */
  maxChars?: number;
};

export function ExpandablePreText({ text, maxChars = 1200 }: Props) {
  const [open, setOpen] = useState(false);
  const need = text.length > maxChars;
  const shown = !need || open ? text : `${text.slice(0, maxChars)}…`;

  return (
    <div>
      <Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: need && !open ? 4 : 0 }}>{shown}</Paragraph>
      {need ? (
        <Button type="link" size="small" onClick={() => setOpen(!open)} style={{ paddingLeft: 0 }}>
          {open ? "Thu gọn" : "Mở rộng"}
        </Button>
      ) : null}
    </div>
  );
}
