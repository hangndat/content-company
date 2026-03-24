import { theme } from "antd";

export function AppLogo() {
  const { token } = theme.useToken();
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: token.borderRadius,
        background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: -0.5,
        flexShrink: 0,
      }}
    >
      CC
    </span>
  );
}
