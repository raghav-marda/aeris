import { postHandler } from "@/lib/api/handler";
import { PlanRequestSchema } from "@/lib/api/schemas";
import { narratePlan } from "@/lib/ai/narrate";
import { buildPlan } from "@/lib/exposure/planner";

export const POST = postHandler("plan", PlanRequestSchema, async ({ profile, air, language }) => {
  const plan = buildPlan(profile, air);
  const narration = await narratePlan(plan, profile, language);
  return { plan, narration };
});
