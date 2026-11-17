/**
 * The only module that talks to Google Gemini. It is deliberately thin: it
 * sends a constrained prompt, asks for JSON, and validates the reply against
 * a zod schema, so unvalidated model output never reaches the rest of the app.
 */
import { z, type ZodType } from "zod";
import { fetchJson, UpstreamError } from "../http";

const DEFAULT_MODEL = "gemini-2.5-flash";
const ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 20_000;
const DEFAULT_TEMPERATURE = 0.3;

const EnvelopeSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({ parts: z.array(z.object({ text: z.string().optional() })) }).optional(),
      })
    )
    .optional(),
});

export interface StructuredRequest<T> {
  readonly system: string;
  readonly user: string;
  readonly schema: ZodType<T>;
  readonly maxOutputTokens: number;
  readonly temperature?: number;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function extractText(envelope: z.infer<typeof EnvelopeSchema>): string {
  const parts = envelope.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? "").join("");
}

/** Calls Gemini and returns schema-validated JSON, or throws an UpstreamError. */
export async function generateStructured<T>(request: StructuredRequest<T>): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new UpstreamError("The AI service is not configured.");

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const envelope = await fetchJson(
    `${ENDPOINT_BASE}/${model}:generateContent`,
    EnvelopeSchema,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: "user", parts: [{ text: request.user }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: request.maxOutputTokens,
          temperature: request.temperature ?? DEFAULT_TEMPERATURE,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
    REQUEST_TIMEOUT_MS
  );

  let json: unknown;
  try {
    json = JSON.parse(extractText(envelope));
  } catch {
    throw new UpstreamError("The AI service returned text that was not valid JSON.");
  }
  const parsed = request.schema.safeParse(json);
  if (!parsed.success) throw new UpstreamError("The AI service returned an unexpected shape.");
  return parsed.data;
}
