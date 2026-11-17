import type { AqiCategory } from "../aqi/cpcb";
import type { ActionId, Effort } from "../exposure/actions";
import type { CommuteMode } from "../exposure/profile";
import type { PersonaId } from "../exposure/engine";
import type { HabitId } from "../exposure/planner";

export const LANGUAGES = ["en", "hi"] as const;
export type Language = (typeof LANGUAGES)[number];

interface Advice {
  readonly title: string;
  readonly reason: string;
}

/** Every user-facing string. Both languages must implement the full shape. */
export interface Messages {
  readonly app: { readonly name: string; readonly tagline: string; readonly skip: string };
  readonly hero: { readonly title: string; readonly subtitle: string };
  readonly a11y: {
    readonly region: string;
    readonly highContrast: string;
    readonly largeText: string;
    readonly language: string;
  };
  readonly location: {
    readonly heading: string;
    readonly cityLabel: string;
    readonly cityPlaceholder: string;
    readonly check: string;
    readonly useMyLocation: string;
    readonly manualToggle: string;
    readonly manualLabel: string;
    readonly manualApply: string;
    readonly loading: string;
    readonly error: string;
    readonly locationDenied: string;
  };
  readonly air: {
    readonly heading: string;
    readonly aqiLabel: string;
    readonly pm25Now: string;
    readonly pm25Mean: string;
    readonly cigarettes: (count: string) => string;
    readonly place: (name: string) => string;
    readonly manualSource: string;
    readonly modelSource: string;
    readonly chartTitle: string;
    readonly chartTableCaption: string;
    readonly hourColumn: string;
    readonly pm25Column: string;
    readonly categories: Readonly<Record<AqiCategory, { label: string; advice: string }>>;
  };
  readonly profile: {
    readonly heading: string;
    readonly describeLabel: string;
    readonly describePlaceholder: string;
    readonly describeButton: string;
    readonly describeBusy: string;
    readonly describeNote: string;
    readonly describeFailed: string;
    readonly adults: string;
    readonly children: string;
    readonly seniors: string;
    readonly sensitiveMember: string;
    readonly commuteMode: string;
    readonly commuteMinutes: string;
    readonly transitAvailable: string;
    readonly childOutdoorMinutes: string;
    readonly windows: string;
    readonly windowOpen: string;
    readonly windowClosed: string;
    readonly hasPurifier: string;
    readonly submit: string;
    readonly submitBusy: string;
    readonly commuteModes: Readonly<Record<CommuteMode, string>>;
  };
  readonly plan: {
    readonly heading: string;
    readonly aiBadge: string;
    readonly fallbackBadge: string;
    readonly exposureHeading: string;
    readonly before: string;
    readonly after: string;
    readonly average: (value: string) => string;
    readonly cigarettes: (count: string) => string;
    readonly personas: Readonly<Record<PersonaId, string>>;
    /** Possessive forms used inside sentences, e.g. "your child’s". */
    readonly personasPossessive: Readonly<Record<PersonaId, string>>;
    readonly underTenth: string;
    readonly actionsHeading: string;
    readonly effort: Readonly<Record<Effort, string>>;
    readonly impact: (whose: string, saving: string, cigarettes: string) => string;
    readonly window: (from: string, to: string, pm25: string) => string;
    readonly habitsHeading: string;
    readonly habitsNote: string;
    readonly assumptionsHeading: string;
    readonly assumptions: readonly string[];
    readonly disclaimer: string;
    readonly error: string;
    readonly actions: Readonly<Record<ActionId, Advice>>;
    readonly habits: Readonly<Record<HabitId, Advice>>;
    readonly headline: (category: string) => string;
    readonly summary: (cigarettes: string) => string;
  };
  readonly ask: {
    readonly heading: string;
    readonly label: string;
    readonly placeholder: string;
    readonly submit: string;
    readonly submitBusy: string;
    readonly suggestions: readonly string[];
    readonly note: string;
    readonly error: string;
    readonly fallbackAnswer: (action: string) => string;
  };
}
