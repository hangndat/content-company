import pino from "pino";

const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "*.apiKey",
  "*.api_key",
  "*.password",
  "*.token",
  "*.secret",
];

export function createLogger(env: "development" | "production" | "test" = "development") {
  return pino({
    level: env === "production" ? "info" : "debug",
    transport:
      env === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
    base: undefined,
    redact: REDACT_PATHS,
    formatters: {
      level: (label) => ({ level: label }),
    },
  });
}

export type Logger = pino.Logger;
