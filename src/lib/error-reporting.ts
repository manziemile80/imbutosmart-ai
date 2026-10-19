type AppReportOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type AppEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: AppReportOptions,
  ) => void;
};

declare global {
  interface Window {
    __appEvents?: AppEvents;
  }
}

// Lightweight error reporter for the React error boundary. It logs the failure
// and forwards it to an in-page telemetry hook when one is installed; there is
// no third-party reporting service, so the app stays self-contained.
export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const payload = {
    source: "react_error_boundary",
    route: window.location.pathname,
    ...context,
  };
  console.error("[app] unhandled error", describeThrown(error), payload);
  window.__appEvents?.captureException?.(error, payload, {
    mechanism: "react_error_boundary",
    handled: false,
    severity: "error",
  });
}

const MAX_SERIALIZED_LENGTH = 2000;

// Loaders and server fns throw raw Responses and plain objects, which String()
// reduces to "[object ...]".
function describeThrown(error: unknown): string {
  if (error instanceof Response) {
    return `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`;
  }
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  const { message } = (error ?? {}) as { message?: unknown };
  if (typeof message === "string" && message.length > 0) return message;
  try {
    return JSON.stringify(error)?.slice(0, MAX_SERIALIZED_LENGTH) ?? String(error);
  } catch {
    return String(error);
  }
}
