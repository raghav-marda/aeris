/**
 * Grounded Q&A about a user's plan. The model sees only the computed facts,
 * so its answers stay consistent with the numbers on screen.
 */
import { z } from "zod";
import type { Plan } from "../exposure/planner";
import type { Profile } from "../exposure/profile";
import { getMessages, type Language } from "../i18n";
import { logError } from "../log";
import { buildFacts } from "./facts";
import { isGeminiConfigured } from "./gemini";
import { generateGrounded } from "./grounded";
import { collectNumbers, extractNumbers } from "./numberGuard";
import { fenceUserText, languageInstruction, SAFETY_RULES } from "./prompt";

const MAX_OUTPUT_TOKENS = 700;

const AnswerSchema = z.object({ answer: z.string().min(1).max(900) });

export interface Answer {
  readonly answer: string;
  readonly source: "ai" | "fallback";
}

const SYSTEM_PROMPT = `You are Aeris, a calm and practical assistant answering a family's question about air pollution and their protection plan.
You receive FACTS (pre-computed) and a QUESTION inside <user_text> tags.
Return JSON: {"answer": string}. Answer in at most four short sentences.
- Stay on air quality, exposure and the plan. If the question is about something else, say you can only help with air quality and the plan.
- If the question needs a doctor (symptoms, medicines, a child who is unwell), say so briefly and suggest seeing a doctor.
- If FACTS cannot answer the question, say what you do not know instead of guessing.
${SAFETY_RULES}`;

export function fallbackAnswer(plan: Plan, language: Language): Answer {
  const messages = getMessages(language);
  const top = plan.actions[0];
  const action = top ? messages.plan.actions[top.id].title : messages.plan.habits.wet_mop.title;
  return { answer: messages.ask.fallbackAnswer(action), source: "fallback" };
}

export async function answerQuestion(
  plan: Plan,
  profile: Profile,
  question: string,
  language: Language
): Promise<Answer> {
  if (!isGeminiConfigured()) return fallbackAnswer(plan, language);

  const facts = buildFacts(plan, profile);
  // The user's own numbers (e.g. a child's age) may be echoed back.
  const allowedNumbers = collectNumbers(facts);
  extractNumbers(question).forEach((n) => allowedNumbers.add(n));

  try {
    const result = await generateGrounded({
      system: `${SYSTEM_PROMPT}\n${languageInstruction(language)}`,
      user: `FACTS:\n${JSON.stringify(facts)}\n\nQUESTION:\n${fenceUserText(question)}`,
      schema: AnswerSchema,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      allowedNumbers,
      textOf: (value) => value.answer,
    });
    return { answer: result.answer, source: "ai" };
  } catch (error) {
    logError("answerQuestion fell back", error);
    return fallbackAnswer(plan, language);
  }
}
