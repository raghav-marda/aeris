import { postHandler } from "@/lib/api/handler";
import { AskRequestSchema } from "@/lib/api/schemas";
import { answerQuestion } from "@/lib/ai/ask";
import { buildPlan } from "@/lib/exposure/planner";

export const POST = postHandler(
  "ask",
  AskRequestSchema,
  async ({ profile, air, language, question }) =>
    answerQuestion(buildPlan(profile, air), profile, question, language)
);
