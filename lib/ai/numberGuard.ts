/**
 * Guards against hallucinated figures. Aeris computes every number in code;
 * the LLM may only restate them. Any number in model text that is not in the
 * set of allowed facts causes the text to be rejected.
 */

const DEVANAGARI_ZERO = 0x0966;
// A number not glued to a letter or another number (so "N95" and "PM2.5" are ignored).
const NUMBER_PATTERN = /(?<![A-Za-z0-9.])\d+(?:\.\d+)?/g;

/** Converts Devanagari digits to ASCII so Hindi text cannot hide numbers. */
function toAsciiDigits(text: string): string {
  return text.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - DEVANAGARI_ZERO));
}

export const normalizeNumber = (token: string): string => String(Number(token));

/**
 * Collects the numbers in a facts object. Only numeric values and strings under
 * keys ending in "Label" count, so identifiers like "wear_n95_commute" never
 * widen the allowed set.
 */
export function collectNumbers(value: unknown, into: Set<string> = new Set(["0"])): Set<string> {
  if (typeof value === "number") {
    into.add(normalizeNumber(String(value)));
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectNumbers(item, into));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === "string" && key.endsWith("Label")) {
        extractNumbers(child).forEach((n) => into.add(n));
      } else {
        collectNumbers(child, into);
      }
    }
  }
  return into;
}

/** Normalised numbers written in `text` (Devanagari digits included). */
export function extractNumbers(text: string): string[] {
  return (toAsciiDigits(text).match(NUMBER_PATTERN) ?? []).map(normalizeNumber);
}

/** Numbers that appear in `text` but not in `allowed`. */
export function findUnsupportedNumbers(text: string, allowed: ReadonlySet<string>): string[] {
  return [...new Set(extractNumbers(text).filter((n) => !allowed.has(n)))];
}
