/**
 * Planning assumptions for the exposure model.
 *
 * These are deliberately conservative, rounded and easy to audit. They are
 * NOT measured values: real results depend on fit, filter, building and
 * traffic. Every figure is surfaced to the user as an assumption.
 */
import type { CommuteMode } from "./profile";

export const HOURS_PER_DAY = 24;
export const MINUTES_PER_HOUR = 60;

/** Share of outdoor PM2.5 that reaches indoor air, by window state. */
export const INDOOR_INFILTRATION = { open: 0.9, closed: 0.6 } as const;

/** Share of indoor PM2.5 removed by a purifier running in the room it sits in. */
export const PURIFIER_REDUCTION = 0.5;

/** Hours a night-time bedroom purifier covers each day. */
export const SLEEP_HOURS = 8;

/** Share of PM2.5 removed by a well-fitted N95 worn by a non-expert. */
export const N95_REDUCTION = 0.5;

/** Share of outdoor PM2.5 a person is exposed to while travelling, by mode. */
export const COMMUTE_EXPOSURE_FACTOR: Readonly<Record<CommuteMode, number>> = {
  walk: 1,
  two_wheeler: 1,
  bus: 0.9,
  car: 0.7,
  metro: 0.5,
  work_from_home: 0,
};

/** Modes where a mask is worth recommending (open to the air). */
export const MASKABLE_MODES: readonly CommuteMode[] = ["walk", "two_wheeler", "bus"];

/** Modes where switching to metro/bus lowers exposure. */
export const SWITCHABLE_MODES: readonly CommuteMode[] = ["car", "two_wheeler"];

/** Fixed outdoor time for a household senior, in minutes per day. */
export const SENIOR_OUTDOOR_MINUTES = 45;

/** Fixed outdoor time for the commuting adult outside the commute, in minutes. */
export const ADULT_OUTDOOR_MINUTES = 30;

/** Local hours (inclusive start, exclusive end) when outdoor activity is sensible. */
export const DAYTIME_HOURS = { start: 6, end: 20 } as const;
export const COMMUTE_HOURS = { start: 5, end: 23 } as const;

/** Effort weights used for ranking: higher means harder, so it ranks lower. */
export const EFFORT_COST = { free: 1, low: 1.5, medium: 2.5 } as const;

/** Extra priority for actions that protect more vulnerable people. */
export const VULNERABILITY_WEIGHT = { adult: 1, child: 1.5, senior: 1.5 } as const;
export const SENSITIVE_MEMBER_MULTIPLIER = 1.25;

/** Maximum number of ranked actions shown to the user. */
export const MAX_ACTIONS = 6;
