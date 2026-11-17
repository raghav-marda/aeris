/**
 * Plain-language explanation of a plan. Gemini writes it from the computed
 * facts; if the model is unavailable or breaks the rules, deterministic text
 * from the message catalogue is used instead, so the app never shows nothing.
 */
import { z } from "zod";
import { cigarettesPerDay } from "../aqi/cigarettes";
import { ACTION_IDS, type ActionId } from "../exposure/actions";
import type { Plan } from "../exposure/planner";
import type { Profile } from "../exposure/profile";
import { getMessages, type Language } from "../i18n";
import { buildFacts } from "./facts";
import { isGeminiConfigured } from "./gemini";
import { generateGrounded } from "./grounded";
import { collectNumbers } from "./numberGuard";
import { languageInstruction, SAFETY_RULES } from "./prompt";

const MAX_OUTPUT_TOKENS = 1400;

const NarrationSchema = z.object({
  headline: z.string().min(1).max(160),
  summary: z.string().min(1).max(420),
  actionNotes: z
    .array(z.object({ id: z.enum(ACTION_IDS), note: z.string().min(1).max(260) }))
    .max(9),
});

export interface Narration {
  readonly headline: string;
  readonly summary: string;
  /** Per-action personalised explanation; missing ids use the catalogue text. */
  readonly actionNotes: Readonly<Partial<Record<ActionId, string>>>;
  readonly source: "ai" | "fallback";
}

const SYSTEM_PROMPT = `You are Aeris, a calm and practical assistant that helps Indian families get through severe winter smog.
You receive FACTS about the air and a household's ranked protection plan, all pre-computed.
Return JSON: {"headline": string, "summary": string, "actionNotes": [{"id": string, "note": string}]}.
- headline: one short, reassuring sentence about today's air.
- summary: two sentences on what the household's exposure looks like and what the plan achieves, using the member numbers.
- actionNotes: one entry per action in FACTS, same id, 1-2 sentences explaining in the household's own terms how this choice changes their exposure.
${SAFETY_RULES}`;

export function fallbackNarration(plan: Plan, language: Language): Narration {
  const messages = getMessages(language);
  const category = messages.air.categories[plan.category].label;
  const cigarettes = cigarettesPerDay(plan.dayMeanPm25);
  return {
    headline: messages.plan.headline(category),
    summary: messages.plan.summary(String(cigarettes)),
    actionNotes: {},
    source: "fallback",
  };
}

export async function narratePlan(
  plan: Plan,
  profile: Profile,
  language: Language
): Promise<Narration> {
  if (!isGeminiConfigured()) return fallbackNarration(plan, language);

  const facts = buildFacts(plan, profile);
  try {
    const result = await generateGrounded({
      system: `${SYSTEM_PROMPT}\n${languageInstruction(language)}`,
      user: `FACTS:\n${JSON.stringify(facts)}`,
      schema: NarrationSchema,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      allowedNumbers: collectNumbers(facts),
      textOf: (value) =>
        [value.headline, value.summary, ...value.actionNotes.map((n) => n.note)].join(" "),
    });

    const planned = new Set<ActionId>(plan.actions.map((a) => a.id));
    const notes: Partial<Record<ActionId, string>> = {};
    for (const { id, note } of result.actionNotes) {
      if (planned.has(id)) notes[id] = note;
    }
    return { headline: result.headline, summary: result.summary, actionNotes: notes, source: "ai" };
  } catch (error) {
    console.error("narratePlan fell back:", error instanceof Error ? error.name : "unknown error");
    return fallbackNarration(plan, language);
  }
}
