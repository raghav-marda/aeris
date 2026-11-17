/**
 * Runs a structured Gemini request and verifies that every number in the reply
 * comes from the supplied facts. If not, the model gets one chance to repair
 * its answer; otherwise the caller falls back to deterministic text.
 */
import { UpstreamError } from "../http";
import { generateStructured, type StructuredRequest } from "./gemini";
import { findUnsupportedNumbers } from "./numberGuard";

const MAX_ATTEMPTS = 2;

export interface GroundedRequest<T> extends StructuredRequest<T> {
  /** Numbers the reply may mention. */
  readonly allowedNumbers: ReadonlySet<string>;
  /** All human-readable text in the reply, to be checked for numbers. */
  readonly textOf: (value: T) => string;
}

export async function generateGrounded<T>(request: GroundedRequest<T>): Promise<T> {
  let user = request.user;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await generateStructured({ ...request, user });
    const unsupported = findUnsupportedNumbers(request.textOf(result), request.allowedNumbers);
    if (unsupported.length === 0) return result;

    user =
      `${request.user}\n\nYour previous reply used numbers that are not in FACTS: ` +
      `${unsupported.join(", ")}. Rewrite it using only numbers that appear in FACTS.`;
  }
  throw new UpstreamError("The AI reply used figures that are not part of the plan.");
}
