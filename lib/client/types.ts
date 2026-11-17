import type { AqiCategory } from "../aqi/cpcb";
import type { Narration } from "../ai/narrate";
import type { Place } from "../air/openMeteo";
import type { Plan } from "../exposure/planner";
import type { HourlyPm25 } from "../exposure/profile";

/** Air data as the UI holds it: either a live lookup or a manual reading. */
export interface AirData {
  readonly place: Place | null;
  readonly pm25: number;
  readonly hourly: readonly HourlyPm25[];
  readonly aqi: number;
  readonly category: AqiCategory;
  readonly source: "model" | "manual";
}

export interface PlanResponse {
  readonly plan: Plan;
  readonly narration: Narration;
}

export type PlanState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | ({ readonly status: "ready" } & PlanResponse);
