import { z } from "zod";

export const COMMUTE_MODES = [
  "walk",
  "two_wheeler",
  "car",
  "bus",
  "metro",
  "work_from_home",
] as const;
export type CommuteMode = (typeof COMMUTE_MODES)[number];

const MAX_MEMBERS = 10;
const MAX_MINUTES = 600;

const countField = z.number().int().min(0).max(MAX_MEMBERS);
const minutesField = z.number().int().min(0).max(MAX_MINUTES);

/**
 * Household details the planner needs. Nothing here is stored: it exists
 * only for the duration of a request.
 */
export const ProfileSchema = z
  .object({
    adults: countField,
    children: countField,
    seniors: countField,
    sensitiveMember: z.boolean(),
    commuteMode: z.enum(COMMUTE_MODES),
    commuteMinutes: minutesField,
    transitAvailable: z.boolean(),
    childOutdoorMinutes: minutesField,
    windows: z.enum(["open", "closed"]),
    hasPurifier: z.boolean(),
  })
  .strict()
  .refine((p) => p.adults + p.children + p.seniors > 0, {
    message: "The household needs at least one person.",
    path: ["adults"],
  });

export type Profile = z.infer<typeof ProfileSchema>;

export const DEFAULT_PROFILE: Profile = {
  adults: 2,
  children: 1,
  seniors: 0,
  sensitiveMember: false,
  commuteMode: "two_wheeler",
  commuteMinutes: 45,
  transitAvailable: true,
  childOutdoorMinutes: 60,
  windows: "open",
  hasPurifier: false,
};

/** Everything the model needs to know about the outdoor air. */
export interface HourlyPm25 {
  /** Local hour of day, 0-23. */
  readonly hour: number;
  readonly pm25: number;
}

export interface AirReading {
  readonly pm25: number;
  readonly hourly: readonly HourlyPm25[];
}
