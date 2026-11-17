/**
 * The "FACTS" handed to the LLM: a compact, fully pre-computed description of
 * the plan. The model explains these facts; it never produces them.
 */
import { getMessages, formatHour } from "../i18n";
import type { ActionId, Effort } from "../exposure/actions";
import type { PersonaId } from "../exposure/engine";
import type { Plan } from "../exposure/planner";
import type { CommuteMode, Profile } from "../exposure/profile";
import { PM25_UG_M3_PER_CIGARETTE } from "../aqi/cigarettes";

export interface PlanFacts {
  readonly aqi: number;
  readonly category: string;
  readonly currentPm25: number;
  readonly dayMeanPm25: number;
  readonly household: {
    readonly commuteMode: CommuteMode;
    readonly commuteMinutes: number;
    readonly children: number;
    readonly seniors: number;
    readonly sensitiveMember: boolean;
    readonly windows: Profile["windows"];
    readonly hasPurifier: boolean;
  };
  readonly members: readonly {
    readonly who: PersonaId;
    readonly beforeUgM3: number;
    readonly afterUgM3: number;
    readonly beforeCigarettes: number;
    readonly afterCigarettes: number;
  }[];
  readonly actions: readonly {
    readonly id: ActionId;
    readonly title: string;
    readonly who: PersonaId;
    readonly effort: Effort;
    readonly savingUgM3: number;
    readonly savingCigarettes: number;
    readonly windowLabel: string | null;
    readonly windowPm25: number | null;
  }[];
  readonly basis: { readonly pm25PerCigarette: number };
}

export function buildFacts(plan: Plan, profile: Profile): PlanFacts {
  const english = getMessages("en");

  return {
    aqi: plan.aqi,
    category: english.air.categories[plan.category].label,
    currentPm25: plan.currentPm25,
    dayMeanPm25: plan.dayMeanPm25,
    household: {
      commuteMode: profile.commuteMode,
      commuteMinutes: profile.commuteMinutes,
      children: profile.children,
      seniors: profile.seniors,
      sensitiveMember: profile.sensitiveMember,
      windows: profile.windows,
      hasPurifier: profile.hasPurifier,
    },
    members: plan.personas.map((p) => ({
      who: p.id,
      beforeUgM3: p.baselineUgM3,
      afterUgM3: p.afterUgM3,
      beforeCigarettes: p.baselineCigarettes,
      afterCigarettes: p.afterCigarettes,
    })),
    actions: plan.actions.map((a) => ({
      id: a.id,
      title: english.plan.actions[a.id].title,
      who: a.personaId,
      effort: a.effort,
      savingUgM3: a.savingUgM3,
      savingCigarettes: a.savingCigarettes,
      windowLabel: a.window
        ? `${formatHour(a.window.startHour)} to ${formatHour(a.window.endHour)}`
        : null,
      windowPm25: a.window?.meanPm25 ?? null,
    })),
    basis: { pm25PerCigarette: PM25_UG_M3_PER_CIGARETTE },
  };
}
