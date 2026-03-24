import { Spin, theme } from "antd";

type PageCenteredSpinProps = {
  tip: string;
};

export function PageCenteredSpin({ tip }: PageCenteredSpinProps) {
  const { token } = theme.useToken();
  return (
    <div
      className="cc-page-loading"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: 360,
        paddingBlock: token.paddingXL,
      }}
    >
      <Spin size="large" tip={tip} />
    </div>
  );
}
