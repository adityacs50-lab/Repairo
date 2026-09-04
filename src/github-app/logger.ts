import pino from "pino";

/**
 * Structured JSON logger shared by the GitHub App. Every log line carries an
 * ISO timestamp; handlers add repo / pr_number / installation_id via child
 * loggers so the context is on every line for that event.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { service: "repairo-github-app" },
});

export type Logger = typeof logger;
