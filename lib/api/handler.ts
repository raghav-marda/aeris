/**
 * Shared plumbing for API routes: rate limiting, JSON parsing, schema
 * validation and consistent error responses. Routes only supply the schema
 * and the business logic.
 */
import { logError } from "../log";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { clientKeyFrom, isRateLimited } from "../rateLimit";
import { UpstreamError } from "../http";

export const MAX_BODY_BYTES = 20_000;

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

const rateLimitedResponse = (): NextResponse =>
  jsonError("Too many requests. Please wait a minute and try again.", 429);

/** Reads and validates a JSON body, or returns the error response to send. */
async function readBody<T>(req: Request, schema: ZodType<T>): Promise<T | NextResponse> {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return jsonError("Request body is too large.", 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }
  const parsed = schema.safeParse(body);
  return parsed.success ? parsed.data : jsonError("Invalid request.", 400);
}

/** Builds a POST handler that rate limits, validates input and runs `run`. */
export function postHandler<T>(
  bucket: string,
  schema: ZodType<T>,
  run: (input: T) => Promise<unknown>
): (req: Request) => Promise<NextResponse> {
  return async (req) => {
    if (isRateLimited(`${bucket}:${clientKeyFrom(req)}`)) return rateLimitedResponse();

    const input = await readBody(req, schema);
    if (input instanceof NextResponse) return input;

    try {
      return NextResponse.json(await run(input));
    } catch (error) {
      logError(`${bucket} failed`, error);
      const status = error instanceof UpstreamError && error.status === 404 ? 404 : 502;
      return jsonError("The request could not be completed.", status);
    }
  };
}
