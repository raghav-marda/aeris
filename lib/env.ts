/**
 * The only module that reads `process.env`. Values are validated on every
 * read (not cached) so a misconfigured variable fails closed and tests can
 * change the environment between cases.
 */
import { z } from "zod";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const apiKeySchema = z.string().trim().min(1);
const modelSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9.-]+$/i);

/** The Gemini API key, or `null` when AI features are not configured. */
export function geminiApiKey(): string | null {
  const parsed = apiKeySchema.safeParse(process.env.GEMINI_API_KEY);
  return parsed.success ? parsed.data : null;
}

/** The Gemini model id; an unset or malformed value falls back to the default. */
export function geminiModel(): string {
  const parsed = modelSchema.safeParse(process.env.GEMINI_MODEL);
  return parsed.success ? parsed.data : DEFAULT_GEMINI_MODEL;
}
