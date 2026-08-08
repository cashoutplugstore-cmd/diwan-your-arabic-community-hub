type ErrorContext = Record<string, unknown>;

/** Local, provider-neutral error reporting hook for Diwan. */
export function reportDiwanError(error: unknown, context: ErrorContext = {}) {
  if (typeof window === "undefined") return;

  const normalized =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  console.error("[Diwan] runtime error", {
    message: normalized,
    route: window.location.pathname,
    ...context,
  });
}
