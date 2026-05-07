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

type LogMeta = Record<string, unknown>;

function normalizeMeta(meta?: unknown): LogMeta | undefined {
  if (meta === undefined) return undefined;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    if (meta instanceof Error) return { name: meta.name, message: meta.message, stack: meta.stack };
    return meta as LogMeta;
  }
  return { value: meta };
}

function formatEntry(level: LogLevel, msg: string, meta?: unknown): LogEntry {
  return { level, msg, ts: new Date().toISOString(), ...normalizeMeta(meta) };
}

const isDev = process.env.NODE_ENV !== "production";

function emit(level: LogLevel, msg: string, meta?: unknown) {
  const entry = formatEntry(level, msg, meta);
  const normalizedMeta = normalizeMeta(meta);

  if (isDev) {
    const prefix: Record<LogLevel, string> = {
      debug: "🔍 DEBUG",
      info: "ℹ️  INFO ",
      warn: "⚠️  WARN ",
      error: "❌ ERROR",
    };
    const metaStr = normalizedMeta ? " " + JSON.stringify(normalizedMeta) : "";
    const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    consoleFn(`[${entry.ts}] ${prefix[level]}: ${msg}${metaStr}`);
  } else {
    // JSON estructurado para producción
    const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    consoleFn(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (msg: string, meta?: unknown) => emit("debug", msg, meta),
  info: (msg: string, meta?: unknown) => emit("info", msg, meta),
  warn: (msg: string, meta?: unknown) => emit("warn", msg, meta),
  error: (msg: string, meta?: unknown) => emit("error", msg, meta),
};
