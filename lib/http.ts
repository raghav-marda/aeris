import type { ZodType } from "zod";

const DEFAULT_TIMEOUT_MS = 10_000;

/** Raised when an upstream service fails, times out or returns unexpected data. */
export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/**
 * Fetches JSON and validates it against a schema, so nothing downstream ever
 * sees data of an unexpected shape. Every request has a hard timeout.
 */
export async function fetchJson<T>(
  url: string,
  schema: ZodType<T>,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new UpstreamError("The upstream service could not be reached.");
  }
  if (!response.ok) {
    throw new UpstreamError(`Upstream responded with HTTP ${response.status}.`, response.status);
  }

  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new UpstreamError("The upstream service returned an unexpected response.");
  }
  return parsed.data;
}
