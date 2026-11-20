/**
 * Runtime schemas for what Aeris's own API routes return. The browser never
 * trusts a response shape on faith: each one is parsed here, and each schema is
 * annotated with the server-side type so the two cannot drift apart silently.
 */
import { z } from "zod";
import type { Answer } from "../ai/ask";
import type { IntakeResult } from "../ai/intake";
import type { Narration } from "../ai/narrate";
import type { Place } from "../air/openMeteo";
import { ACTION_IDS } from "../exposure/actions";
import type { Plan } from "../exposure/planner";
import { COMMUTE_MODES } from "../exposure/profile";
import type { AirData } from "./types";

const source = z.enum(["ai", "fallback"]);
const category = z.enum(["good", "satisfactory", "moderate", "poor", "veryPoor", "severe"]);
const persona = z.enum(["adult", "child", "senior"]);
const count = z.number().int().nullable();

const placeSchema: z.ZodType<Place> = z.object({
  name: z.string(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
});

const hourSchema = z.object({ hour: z.number().int(), pm25: z.number() });

/** Response of `/api/air`: everything in `AirData` except the client-set `source`. */
export const airResponseSchema: z.ZodType<Omit<AirData, "source">> = z.object({
  place: placeSchema.nullable(),
  pm25: z.number(),
  hourly: z.array(hourSchema),
  aqi: z.number(),
  category,
});

const planSchema: z.ZodType<Plan> = z.object({
  currentPm25: z.number(),
  dayMeanPm25: z.number(),
  aqi: z.number(),
  category,
  personas: z.array(
    z.object({
      id: persona,
      baselineUgM3: z.number(),
      afterUgM3: z.number(),
      baselineCigarettes: z.number(),
      afterCigarettes: z.number(),
    })
  ),
  actions: z.array(
    z.object({
      id: z.enum(ACTION_IDS),
      rank: z.number().int(),
      effort: z.enum(["free", "low", "medium"]),
      personaId: persona,
      savingUgM3: z.number(),
      savingCigarettes: z.number(),
      window: z
        .object({ startHour: z.number(), endHour: z.number(), meanPm25: z.number() })
        .nullable(),
    })
  ),
  habits: z.array(
    z.enum(["wet_mop", "no_burning", "kitchen_exhaust", "no_idling", "avoid_exertion"])
  ),
});

const narrationSchema: z.ZodType<Narration> = z.object({
  headline: z.string(),
  summary: z.string(),
  actionNotes: z.partialRecord(z.enum(ACTION_IDS), z.string()),
  source,
});

export const planResponseSchema = z.object({ plan: planSchema, narration: narrationSchema });

export const answerSchema: z.ZodType<Answer> = z.object({ answer: z.string(), source });

export const intakeResultSchema: z.ZodType<IntakeResult> = z.object({
  intake: z.object({
    adults: count,
    children: count,
    seniors: count,
    sensitiveMember: z.boolean().nullable(),
    commuteMode: z.enum(COMMUTE_MODES).nullable(),
    commuteMinutes: count,
    transitAvailable: z.boolean().nullable(),
    childOutdoorMinutes: count,
    windows: z.enum(["open", "closed"]).nullable(),
    hasPurifier: z.boolean().nullable(),
  }),
  source,
});
