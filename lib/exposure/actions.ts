/**
 * Catalogue of protective actions. Each action is a pure transformation of a
 * person's exposure inputs, so its benefit is simply "exposure before minus
 * exposure after" and overlapping actions never double count.
 */
import { POOR_PM25_THRESHOLD } from "../aqi/cpcb";
import type { EFFORT_COST } from "./constants";
import {
  COMMUTE_EXPOSURE_FACTOR,
  COMMUTE_HOURS,
  DAYTIME_HOURS,
  INDOOR_INFILTRATION,
  MASKABLE_MODES,
  MINUTES_PER_HOUR,
  N95_REDUCTION,
  SLEEP_HOURS,
  SWITCHABLE_MODES,
} from "./constants";
import { findBestWindow, type ExposureInputs, type PersonaId, type TimeWindow } from "./engine";
import type { AirReading, Profile } from "./profile";

export const ACTION_IDS = [
  "wear_n95_commute",
  "shift_commute",
  "switch_to_transit",
  "bedroom_purifier",
  "close_windows",
  "kids_play_window",
  "kids_play_indoors",
  "seniors_walk_window",
  "seniors_stay_in",
] as const;
export type ActionId = (typeof ACTION_IDS)[number];

export type Effort = keyof typeof EFFORT_COST;

export interface ActionContext {
  readonly profile: Profile;
  readonly air: AirReading;
  readonly dayMeanPm25: number;
}

export interface ActionResult {
  readonly inputs: ExposureInputs;
  readonly window: TimeWindow | null;
}

export interface ActionDefinition {
  readonly id: ActionId;
  /** Who it protects; "household" actions apply to every member. */
  readonly scope: PersonaId | "household";
  readonly effort: Effort;
  /** Actions sharing a group are alternatives: only the best one is kept. */
  readonly group?: string;
  /** Returns the changed inputs, or null when the action does not apply. */
  readonly apply: (
    inputs: ExposureInputs,
    context: ActionContext,
    persona: PersonaId
  ) => ActionResult | null;
}

const hoursOf = (minutes: number): number => minutes / MINUTES_PER_HOUR;

/**
 * Moves an outdoor segment into the cleanest daytime window. Only suggested
 * when that window is cleaner than now AND below the CPCB "poor" level, so
 * children and seniors are never sent outside into genuinely poor air.
 */
function moveToCleanWindow(inputs: ExposureInputs, context: ActionContext): ActionResult | null {
  const { outdoor } = inputs;
  if (outdoor.minutes === 0) return null;
  const window = findBestWindow(context.air.hourly, hoursOf(outdoor.minutes), DAYTIME_HOURS);
  const acceptable = window !== null && window.meanPm25 < POOR_PM25_THRESHOLD;
  if (!window || !acceptable || window.meanPm25 >= outdoor.pm25) return null;
  return { inputs: { ...inputs, outdoor: { ...outdoor, pm25: window.meanPm25 } }, window };
}

/** Moves outdoor time indoors on days that are poor or worse. */
function moveIndoors(inputs: ExposureInputs, { dayMeanPm25 }: ActionContext): ActionResult | null {
  if (inputs.outdoor.minutes === 0 || dayMeanPm25 < POOR_PM25_THRESHOLD) return null;
  return { inputs: { ...inputs, outdoor: { ...inputs.outdoor, minutes: 0 } }, window: null };
}

export const ACTIONS: readonly ActionDefinition[] = [
  {
    id: "wear_n95_commute",
    scope: "adult",
    effort: "low",
    apply: (inputs, { profile }) => {
      if (inputs.commute.minutes === 0 || !MASKABLE_MODES.includes(profile.commuteMode)) {
        return null;
      }
      const commute = { ...inputs.commute, maskReduction: N95_REDUCTION };
      return { inputs: { ...inputs, commute }, window: null };
    },
  },
  {
    id: "shift_commute",
    scope: "adult",
    effort: "free",
    group: "commute_timing",
    apply: (inputs, { air }) => {
      const { commute } = inputs;
      if (commute.minutes === 0) return null;
      const window = findBestWindow(air.hourly, hoursOf(commute.minutes), COMMUTE_HOURS);
      if (!window || window.meanPm25 >= commute.pm25) return null;
      return { inputs: { ...inputs, commute: { ...commute, pm25: window.meanPm25 } }, window };
    },
  },
  {
    id: "switch_to_transit",
    scope: "adult",
    effort: "low",
    apply: (inputs, { profile }) => {
      const eligible =
        profile.transitAvailable &&
        SWITCHABLE_MODES.includes(profile.commuteMode) &&
        inputs.commute.minutes > 0;
      if (!eligible) return null;
      const commute = { ...inputs.commute, exposureFactor: COMMUTE_EXPOSURE_FACTOR.metro };
      return { inputs: { ...inputs, commute }, window: null };
    },
  },
  {
    id: "bedroom_purifier",
    scope: "household",
    effort: "medium",
    apply: (inputs, { profile }) => {
      if (profile.hasPurifier) return null;
      const indoor = { ...inputs.indoor, purifierHours: SLEEP_HOURS };
      return { inputs: { ...inputs, indoor }, window: null };
    },
  },
  {
    id: "close_windows",
    scope: "household",
    effort: "free",
    apply: (inputs, { profile }) => {
      if (profile.windows === "closed") return null;
      const indoor = { ...inputs.indoor, infiltration: INDOOR_INFILTRATION.closed };
      return { inputs: { ...inputs, indoor }, window: null };
    },
  },
  {
    id: "kids_play_window",
    scope: "child",
    effort: "free",
    group: "child_outdoor",
    apply: (inputs, context) => moveToCleanWindow(inputs, context),
  },
  {
    id: "kids_play_indoors",
    scope: "child",
    effort: "free",
    group: "child_outdoor",
    apply: moveIndoors,
  },
  {
    id: "seniors_walk_window",
    scope: "senior",
    effort: "free",
    group: "senior_outdoor",
    apply: (inputs, context) => moveToCleanWindow(inputs, context),
  },
  {
    id: "seniors_stay_in",
    scope: "senior",
    effort: "free",
    group: "senior_outdoor",
    apply: moveIndoors,
  },
];
