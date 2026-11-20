/**
 * Server-side error logging in one place. Only the error's name is logged,
 * never its message or stack, so user text and secrets cannot leak into logs.
 */
export function logError(scope: string, error: unknown): void {
  console.error(`${scope}:`, error instanceof Error ? error.name : "unknown error");
}
