import { trace } from "@opentelemetry/api";

/**
 * Structured JSON logger.
 *
 * Every line includes the active OpenTelemetry trace_id / span_id, so a log
 * line can be matched to its full request trace (Jaeger, Vercel, Datadog, …).
 * Secrets and personal data are redacted: log user IDs, never emails/passwords.
 */
type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel: Level = (process.env.LOG_LEVEL as Level) in LEVELS ? (process.env.LOG_LEVEL as Level) : "info";
const pretty = process.env.LOG_FORMAT === "pretty";

const SENSITIVE_KEY = /pass(word)?|token|secret|authorization|cookie|api[-_]?key|email|phone/i;

/** Redacts sensitive keys and serialises errors (incl. Supabase/PostgREST errors). */
export function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[depth]";
  if (value instanceof Error) {
    const extra = value as Error & { code?: string; digest?: string; status?: number; details?: string; hint?: string };
    return {
      name: value.name,
      message: value.message,
      ...(extra.code ? { code: extra.code } : {}),
      ...(extra.status ? { status: extra.status } : {}),
      ...(extra.digest ? { digest: extra.digest } : {}),
      ...(extra.details ? { details: extra.details } : {}),
      ...(extra.hint ? { hint: extra.hint } : {}),
      stack: value.stack?.split("\n").slice(0, 8).join("\n"),
    };
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitize(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Fields = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : sanitize(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 2000) return `${value.slice(0, 2000)}…`;
  return value;
}

/** Current trace/span IDs (empty when no span is active). */
export function traceContext(): { trace_id?: string; span_id?: string } {
  const ctx = trace.getActiveSpan()?.spanContext();
  if (!ctx || ctx.traceId === "00000000000000000000000000000000") return {};
  return { trace_id: ctx.traceId, span_id: ctx.spanId };
}

function write(level: Level, message: string, fields: Fields = {}) {
  if (LEVELS[level] < LEVELS[minLevel]) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "mallumarktplatz",
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    ...traceContext(),
    ...(sanitize(fields) as Fields),
  };
  const line = pretty
    ? `${entry.timestamp} ${level.toUpperCase().padEnd(5)} ${message} ${JSON.stringify({ ...entry, timestamp: undefined, level: undefined, message: undefined })}`
    : JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);

  // Errors are also attached to the active span so they show up in the trace view.
  if (level === "error" || level === "warn") {
    const span = trace.getActiveSpan();
    span?.addEvent(`log.${level}`, { "log.message": message, "log.fields": JSON.stringify(sanitize(fields)) });
  }
}

export const logger = {
  debug: (message: string, fields?: Fields) => write("debug", message, fields),
  info: (message: string, fields?: Fields) => write("info", message, fields),
  warn: (message: string, fields?: Fields) => write("warn", message, fields),
  error: (message: string, fields?: Fields) => write("error", message, fields),
};
