import "server-only";
import { SpanStatusCode, trace, type Attributes } from "@opentelemetry/api";
import { unstable_rethrow } from "next/navigation";
import { logger, traceContext } from "@/lib/logger";

export const tracer = trace.getTracer("mallumarktplatz");

/** Short reference users can quote to support (= first 16 hex chars of the trace ID). */
export function errorReference(): string | undefined {
  return traceContext().trace_id?.slice(0, 16);
}

/** Runs `fn` inside a child span; records exceptions and duration. */
export async function withSpan<T>(name: string, attributes: Attributes, fn: () => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await fn();
    } catch (error) {
      try {
        unstable_rethrow(error); // redirect()/notFound() are control flow, not errors
      } catch (controlFlow) {
        throw controlFlow;
      }
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error)?.message });
      throw error;
    } finally {
      span.end();
    }
  });
}

type ResultLike = { status?: string; ok?: boolean; message?: string; error?: string; fieldErrors?: unknown };

function isFailure(result: unknown): result is ResultLike {
  if (!result || typeof result !== "object") return false;
  const r = result as ResultLike;
  return r.status === "error" || r.ok === false;
}

/**
 * Wraps a Server Action: one span per call (`action <name>`), a structured log
 * line with outcome + duration, and the trace ID attached to failed results
 * (`reference`) so the UI can show it to the user.
 */
export async function traceAction<A extends unknown[], R>(
  name: string,
  fn: (...args: A) => Promise<R>,
  args: A,
): Promise<R> {
  return tracer.startActiveSpan(`action ${name}`, { attributes: { "app.action": name } }, async (span) => {
    const started = performance.now();
    const done = (outcome: string, level: "info" | "warn" | "error", fields: Record<string, unknown> = {}) => {
      const duration_ms = Math.round(performance.now() - started);
      span.setAttribute("app.action.outcome", outcome);
      span.setAttribute("app.action.duration_ms", duration_ms);
      logger[level](`action ${name} ${outcome}`, { action: name, outcome, duration_ms, ...fields });
    };

    try {
      const result = await fn(...args);
      if (isFailure(result)) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: result.message ?? result.error ?? "failed" });
        done("failed", "warn", {
          result_message: result.message ?? result.error,
          field_errors: result.fieldErrors ? Object.keys(result.fieldErrors as object) : undefined,
        });
        return { ...result, reference: errorReference() } as R;
      }
      done("ok", "info");
      return result;
    } catch (error) {
      try {
        unstable_rethrow(error);
      } catch (controlFlow) {
        done("redirect", "info");
        throw controlFlow;
      }
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error)?.message });
      done("exception", "error", { error });
      throw error;
    } finally {
      span.end();
    }
  });
}

/** Adds the authenticated user's (pseudonymous) ID to the current span. */
export function setSpanUser(userId: string, role?: string) {
  const span = trace.getActiveSpan();
  span?.setAttribute("enduser.id", userId);
  if (role) span?.setAttribute("enduser.role", role);
}
