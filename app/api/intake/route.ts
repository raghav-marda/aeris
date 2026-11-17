import { postHandler } from "@/lib/api/handler";
import { IntakeRequestSchema } from "@/lib/api/schemas";
import { extractIntake } from "@/lib/ai/intake";

export const POST = postHandler("intake", IntakeRequestSchema, ({ text }) => extractIntake(text));
