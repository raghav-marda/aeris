/**
 * Turns a household profile and an air reading into a ranked protection plan
 * with before/after exposure. All numbers come from here, never from the LLM.
 */
import { cigarettesPerDay } from "../aqi/cigarettes";
import { categorizePm25, MODERATE_PM25_THRESHOLD, pm25ToAqi, type AqiCategory } from "../aqi/cpcb";
import {
  EFFORT_COST,
  MAX_ACTIONS,
  SENSITIVE_MEMBER_MULTIPLIER,
  VULNERABILITY_WEIGHT,
} from "./constants";
import {
  ACTIONS,
  type ActionContext,
  type ActionDefinition,
  type ActionId,
  type Effort,
} from "./actions";
import {
  baselineInputs,
  dailyAverageExposure,
  dayMeanPm25,
  type ExposureInputs,
  type PersonaId,
  type TimeWindow,
} from "./engine";
import type { AirReading, Profile } from "./profile";

/** Smallest daily-average saving (µg/m³) worth showing as an action. */
const MIN_SAVING_UG_M3 = 0.3;

export type HabitId = "wet_mop" | "no_burning" | "kitchen_exhaust" | "no_idling" | "avoid_exertion";

export interface PersonaSummary {
  readonly id: PersonaId;
  readonly baselineUgM3: number;
  readonly afterUgM3: number;
  readonly baselineCigarettes: number;
  readonly afterCigarettes: number;
}

export interface PlannedAction {
  readonly id: ActionId;
  readonly rank: number;
  readonly effort: Effort;
  /** Member who benefits most from this action. */
  readonly personaId: PersonaId;
  readonly savingUgM3: number;
  readonly savingCigarettes: number;
  readonly window: TimeWindow | null;
}

export interface Plan {
  readonly currentPm25: number;
  readonly dayMeanPm25: number;
  readonly aqi: number;
  readonly category: AqiCategory;
  readonly personas: readonly PersonaSummary[];
  readonly actions: readonly PlannedAction[];
  readonly habits: readonly HabitId[];
}

type StateMap = Map<PersonaId, ExposureInputs>;

const round1 = (value: number): number => Math.round(value * 10) / 10;

export function personasFor(profile: Profile): PersonaId[] {
  const personas: PersonaId[] = [];
  if (profile.adults > 0) personas.push("adult");
  if (profile.children > 0) personas.push("child");
  if (profile.seniors > 0) personas.push("senior");
  return personas;
}

function inputsOf(state: StateMap, personaId: PersonaId): ExposureInputs {
  const inputs = state.get(personaId);
  if (!inputs) throw new Error(`No exposure inputs for persona "${personaId}".`);
  return inputs;
}

const targetsOf = (action: ActionDefinition, personas: readonly PersonaId[]): PersonaId[] =>
  action.scope === "household" ? [...personas] : personas.filter((p) => p === action.scope);

interface Saving {
  readonly personaId: PersonaId;
  readonly savingUgM3: number;
  readonly window: TimeWindow | null;
  readonly next: ExposureInputs;
}

/** Savings per targeted persona if `action` were applied to `state` now. */
function evaluate(
  action: ActionDefinition,
  state: StateMap,
  personas: readonly PersonaId[],
  context: ActionContext
): Saving[] {
  const savings: Saving[] = [];
  for (const personaId of targetsOf(action, personas)) {
    const current = state.get(personaId);
    const result = current ? action.apply(current, context, personaId) : null;
    if (!current || !result) continue;
    const savingUgM3 = dailyAverageExposure(current) - dailyAverageExposure(result.inputs);
    if (savingUgM3 > 0) {
      savings.push({ personaId, savingUgM3, window: result.window, next: result.inputs });
    }
  }
  return savings;
}

function priorityScore(action: ActionDefinition, savings: readonly Saving[], profile: Profile) {
  const weighted = savings.reduce(
    (sum, s) => sum + s.savingUgM3 * VULNERABILITY_WEIGHT[s.personaId],
    0
  );
  const sensitivity = profile.sensitiveMember ? SENSITIVE_MEMBER_MULTIPLIER : 1;
  return (weighted * sensitivity) / EFFORT_COST[action.effort];
}

function habitsFor(profile: Profile, meanPm25: number): HabitId[] {
  const habits: HabitId[] = ["wet_mop", "no_burning", "kitchen_exhaust"];
  if (profile.commuteMode === "car" || profile.commuteMode === "two_wheeler") {
    habits.push("no_idling");
  }
  if (meanPm25 >= MODERATE_PM25_THRESHOLD) habits.push("avoid_exertion");
  return habits;
}

export function buildPlan(profile: Profile, air: AirReading): Plan {
  const personas = personasFor(profile);
  const meanPm25 = dayMeanPm25(air);
  const context: ActionContext = { profile, air, dayMeanPm25: meanPm25 };

  const baseline: StateMap = new Map(personas.map((p) => [p, baselineInputs(p, profile, air)]));
  const state: StateMap = new Map(baseline);

  // Rank by standalone value, then apply in order so reported savings are marginal.
  const ranked = ACTIONS.map((action) => ({
    action,
    score: priorityScore(action, evaluate(action, baseline, personas, context), profile),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const usedGroups = new Set<string>();
  const actions: PlannedAction[] = [];

  for (const { action } of ranked) {
    if (action.group && usedGroups.has(action.group)) continue;
    const savings = evaluate(action, state, personas, context);
    const top = [...savings].sort((a, b) => b.savingUgM3 - a.savingUgM3)[0];
    if (!top || top.savingUgM3 < MIN_SAVING_UG_M3) continue;

    savings.forEach((s) => state.set(s.personaId, s.next));
    if (action.group) usedGroups.add(action.group);
    actions.push({
      id: action.id,
      rank: actions.length + 1,
      effort: action.effort,
      personaId: top.personaId,
      savingUgM3: round1(top.savingUgM3),
      savingCigarettes: cigarettesPerDay(top.savingUgM3),
      window: top.window,
    });
    if (actions.length === MAX_ACTIONS) break;
  }

  const summaries: PersonaSummary[] = personas.map((id) => {
    const before = dailyAverageExposure(inputsOf(baseline, id));
    const after = dailyAverageExposure(inputsOf(state, id));
    return {
      id,
      baselineUgM3: before,
      afterUgM3: after,
      baselineCigarettes: cigarettesPerDay(before),
      afterCigarettes: cigarettesPerDay(after),
    };
  });

  return {
    currentPm25: round1(air.pm25),
    dayMeanPm25: round1(meanPm25),
    aqi: pm25ToAqi(air.pm25),
    category: categorizePm25(air.pm25),
    personas: summaries,
    actions,
    habits: habitsFor(profile, meanPm25),
  };
}
