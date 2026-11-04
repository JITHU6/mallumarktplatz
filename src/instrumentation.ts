import type { Instrumentation } from "next";
import { registerOTel } from "@vercel/otel";

/**
 * OpenTelemetry setup.
 * - On Vercel: traces go to Vercel Observability / configured tracing integrations.
 * - Elsewhere: set OTEL_EXPORTER_OTLP_ENDPOINT (e.g. http://localhost:4318 for the
 *   local Jaeger in observability/docker-compose.yml) to export via OTLP.
 */
export function register() {
  registerOTel({
    serviceName: "mallumarktplatz",
    attributes: { "deployment.environment": process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development" },
    instrumentationConfig: {
      fetch: {
        // Don't leak trace headers to third parties (Mapbox); Supabase is traced as a client span.
        propagateContextUrls: [],
        ignoreUrls: [/\/_next\//],
      },
    },
  });
}

/** Captures every uncaught server error (pages, layouts, route handlers, actions). */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { logger } = await import("@/lib/logger");
  const err = error as Error & { digest?: string };
  logger.error("unhandled request error", {
    error: err,
    digest: err?.digest,
    request: { method: request.method, path: request.path.split("?")[0] },
    route: context.routePath,
    route_type: context.routeType,
    router: context.routerKind,
    render_source: "renderSource" in context ? context.renderSource : undefined,
  });
};
