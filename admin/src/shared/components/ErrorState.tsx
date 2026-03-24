import { Alert, Button, Space } from "antd";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ message, onRetry, retryLabel = "Thử lại" }: ErrorStateProps) {
  return (
    <Alert
      type="error"
      message={message}
      showIcon
      action={
        onRetry ? (
          <Space>
            <Button size="small" type="primary" onClick={onRetry}>
              {retryLabel}
            </Button>
          </Space>
        ) : undefined
      }
    />
  );
}
