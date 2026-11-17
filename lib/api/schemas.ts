/** Request schemas for every API route. All are strict: unknown keys are rejected. */
import { z } from "zod";
import { LANGUAGES } from "../i18n";
import { ProfileSchema } from "../exposure/profile";

const MAX_PM25 = 1000;
const MAX_HOURLY_POINTS = 48;
const MAX_CITY_LENGTH = 80;
const MAX_INTAKE_LENGTH = 500;
const MAX_QUESTION_LENGTH = 300;

const pm25Value = z.number().min(0).max(MAX_PM25);

export const AirInputSchema = z
  .object({
    pm25: pm25Value,
    hourly: z
      .array(z.object({ hour: z.number().int().min(0).max(23), pm25: pm25Value }).strict())
      .max(MAX_HOURLY_POINTS),
  })
  .strict();

export const AirQuerySchema = z.union([
  z.object({ city: z.string().trim().min(2).max(MAX_CITY_LENGTH) }).strict(),
  z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lon: z.coerce.number().min(-180).max(180),
    })
    .strict(),
]);

const language = z.enum(LANGUAGES);

export const PlanRequestSchema = z
  .object({ profile: ProfileSchema, air: AirInputSchema, language })
  .strict();

export const AskRequestSchema = z
  .object({
    profile: ProfileSchema,
    air: AirInputSchema,
    language,
    question: z.string().trim().min(3).max(MAX_QUESTION_LENGTH),
  })
  .strict();

export const IntakeRequestSchema = z
  .object({ text: z.string().trim().min(3).max(MAX_INTAKE_LENGTH) })
  .strict();
