/**
 * Logger estructurado para Folilco Nativo.
 * En producción emite JSON (ideal para Vercel/Datadog).
 * En desarrollo emite texto legible.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

function formatEntry(level: LogLevel, msg: string, meta?: Record<string, unknown>): LogEntry {
  return { level, msg, ts: new Date().toISOString(), ...meta };
}

const isDev = process.env.NODE_ENV !== "production";

function emit(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  const entry = formatEntry(level, msg, meta);

  if (isDev) {
    const prefix: Record<LogLevel, string> = {
      debug: "🔍 DEBUG",
      info: "ℹ️  INFO ",
      warn: "⚠️  WARN ",
      error: "❌ ERROR",
    };
    const metaStr = meta ? " " + JSON.stringify(meta) : "";
    const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    consoleFn(`[${entry.ts}] ${prefix[level]}: ${msg}${metaStr}`);
  } else {
    // JSON estructurado para producción
    const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    consoleFn(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};
