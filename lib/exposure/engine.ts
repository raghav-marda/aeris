/**
 * Deterministic exposure model: a time-weighted 24-hour average PM2.5 dose
 * across the places a person spends the day (travelling, outdoors, indoors).
 * Pure functions only, so every number can be reproduced and unit tested.
 */
import {
  ADULT_OUTDOOR_MINUTES,
  COMMUTE_EXPOSURE_FACTOR,
  HOURS_PER_DAY,
  INDOOR_INFILTRATION,
  MINUTES_PER_HOUR,
  PURIFIER_REDUCTION,
  SENIOR_OUTDOOR_MINUTES,
  SLEEP_HOURS,
} from "./constants";
import type { AirReading, HourlyPm25, Profile } from "./profile";

export type PersonaId = "adult" | "child" | "senior";

/** A block of the day spent in one setting. */
export interface Segment {
  readonly minutes: number;
  readonly pm25: number;
  /** Share of the outdoor concentration actually breathed in this segment. */
  readonly exposureFactor: number;
  readonly maskReduction: number;
}

export interface ExposureInputs {
  readonly commute: Segment;
  readonly outdoor: Segment;
  readonly indoor: {
    readonly dayMeanPm25: number;
    readonly infiltration: number;
    readonly purifierHours: number;
  };
}

const mean = (values: readonly number[]): number =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Average PM2.5 over the next 24 hours, or the current reading if no forecast. */
export function dayMeanPm25(air: AirReading): number {
  return air.hourly.length > 0 ? mean(air.hourly.map((h) => h.pm25)) : air.pm25;
}

const segmentDose = (segment: Segment): number =>
  (segment.minutes / MINUTES_PER_HOUR) *
  segment.pm25 *
  segment.exposureFactor *
  (1 - segment.maskReduction);

/** Time-weighted 24-hour average exposure, in µg/m³, rounded to one decimal. */
export function dailyAverageExposure(inputs: ExposureInputs): number {
  const { commute, outdoor, indoor } = inputs;
  const travelHours = (commute.minutes + outdoor.minutes) / MINUTES_PER_HOUR;
  const indoorHours = Math.max(0, HOURS_PER_DAY - travelHours);
  const indoorPm25 = indoor.dayMeanPm25 * indoor.infiltration;
  const purifiedHours = Math.min(indoor.purifierHours, indoorHours);
  const indoorDose =
    (indoorHours - purifiedHours) * indoorPm25 +
    purifiedHours * indoorPm25 * (1 - PURIFIER_REDUCTION);

  return round1((segmentDose(commute) + segmentDose(outdoor) + indoorDose) / HOURS_PER_DAY);
}

function outdoorSegment(minutes: number, pm25: number): Segment {
  return { minutes, pm25, exposureFactor: 1, maskReduction: 0 };
}

/** Builds the starting point for one household member from the profile. */
export function baselineInputs(
  persona: PersonaId,
  profile: Profile,
  air: AirReading
): ExposureInputs {
  const dayMean = dayMeanPm25(air);
  const commuting = persona === "adult" && profile.commuteMode !== "work_from_home";
  const outdoorMinutes = {
    adult: ADULT_OUTDOOR_MINUTES,
    child: profile.childOutdoorMinutes,
    senior: SENIOR_OUTDOOR_MINUTES,
  }[persona];

  return {
    commute: {
      minutes: commuting ? profile.commuteMinutes : 0,
      pm25: dayMean,
      exposureFactor: COMMUTE_EXPOSURE_FACTOR[profile.commuteMode],
      maskReduction: 0,
    },
    outdoor: outdoorSegment(outdoorMinutes, dayMean),
    indoor: {
      dayMeanPm25: dayMean,
      infiltration: INDOOR_INFILTRATION[profile.windows],
      purifierHours: profile.hasPurifier ? SLEEP_HOURS : 0,
    },
  };
}

export interface TimeWindow {
  readonly startHour: number;
  readonly endHour: number;
  readonly meanPm25: number;
}

export interface HourRange {
  readonly start: number;
  readonly end: number;
}

const isConsecutive = (a: HourlyPm25, b: HourlyPm25): boolean => b.hour === (a.hour + 1) % 24;

/** Lowest-PM2.5 run of consecutive hours that all fall inside `range`. */
export function findBestWindow(
  hourly: readonly HourlyPm25[],
  durationHours: number,
  range: HourRange
): TimeWindow | null {
  const length = Math.max(1, Math.ceil(durationHours));
  let best: TimeWindow | null = null;

  for (let i = 0; i + length <= hourly.length; i++) {
    const run = hourly.slice(i, i + length);
    const inRange = run.every((h) => h.hour >= range.start && h.hour < range.end);
    const contiguous = run.every((h, idx) => idx === 0 || isConsecutive(run[idx - 1], h));
    if (!inRange || !contiguous) continue;

    const meanPm25 = round1(mean(run.map((h) => h.pm25)));
    if (best === null || meanPm25 < best.meanPm25) {
      best = { startHour: run[0].hour, endHour: (run[length - 1].hour + 1) % 24, meanPm25 };
    }
  }
  return best;
}
