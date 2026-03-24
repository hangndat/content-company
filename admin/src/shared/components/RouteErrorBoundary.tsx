import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "./ErrorState";
import { PageShell } from "./PageShell";

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const stack = info.componentStack?.replace(/\s+/g, " ").trim() ?? "";
    console.error("[RouteErrorBoundary]", error.message, stack.length > 500 ? `${stack.slice(0, 500)}…` : stack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { error, hasError } = this.state;
    if (hasError && error) {
      return (
        <PageShell>
          <ErrorState message={error.message || "Lỗi hiển thị trang."} onRetry={this.handleRetry} retryLabel="Thử lại" />
        </PageShell>
      );
    }
    return this.props.children;
  }
}
