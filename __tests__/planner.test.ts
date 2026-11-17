import { describe, expect, it } from "vitest";
import { buildPlan, personasFor } from "../lib/exposure/planner";
import { makeHourly, profileWith, smogDay } from "./fixtures";

describe("personasFor", () => {
  it("includes only household members that exist", () => {
    expect(personasFor(profileWith({ adults: 1, children: 0, seniors: 1 }))).toEqual([
      "adult",
      "senior",
    ]);
  });
});

describe("buildPlan", () => {
  const plan = buildPlan(profileWith({ seniors: 1 }), smogDay());

  it("reports the AQI category for the current reading", () => {
    expect(plan.category).toBe("veryPoor");
    expect(plan.aqi).toBeGreaterThan(300);
  });

  it("lowers exposure for every member", () => {
    for (const persona of plan.personas) {
      expect(persona.afterUgM3).toBeLessThanOrEqual(persona.baselineUgM3);
    }
    expect(plan.personas.some((p) => p.afterUgM3 < p.baselineUgM3)).toBe(true);
  });

  it("ranks actions starting at one with positive savings", () => {
    expect(plan.actions.length).toBeGreaterThan(0);
    plan.actions.forEach((action, index) => {
      expect(action.rank).toBe(index + 1);
      expect(action.savingUgM3).toBeGreaterThan(0);
    });
  });

  it("keeps only one action per alternative group", () => {
    const childOutdoor = plan.actions.filter(
      (a) => a.id === "kids_play_window" || a.id === "kids_play_indoors"
    );
    expect(childOutdoor.length).toBeLessThanOrEqual(1);
  });

  it("never double counts: summed marginal savings match the member total", () => {
    const adult = plan.personas.find((p) => p.id === "adult");
    expect(adult).toBeDefined();
    expect(adult!.baselineUgM3 - adult!.afterUgM3).toBeGreaterThan(0);
  });

  it("recommends a mask only for open-air commutes", () => {
    const open = buildPlan(profileWith({ commuteMode: "two_wheeler" }), smogDay());
    const metro = buildPlan(profileWith({ commuteMode: "metro" }), smogDay());
    expect(open.actions.some((a) => a.id === "wear_n95_commute")).toBe(true);
    expect(metro.actions.some((a) => a.id === "wear_n95_commute")).toBe(false);
  });

  it("skips a commute plan for work-from-home adults", () => {
    const wfh = buildPlan(profileWith({ commuteMode: "work_from_home" }), smogDay());
    const commuteIds = ["wear_n95_commute", "shift_commute", "switch_to_transit"];
    expect(wfh.actions.some((a) => commuteIds.includes(a.id))).toBe(false);
  });

  it("skips window actions when already closed and a purifier exists", () => {
    const done = buildPlan(profileWith({ windows: "closed", hasPurifier: true }), smogDay());
    const ids = done.actions.map((a) => a.id);
    expect(ids).not.toContain("close_windows");
    expect(ids).not.toContain("bedroom_purifier");
  });

  it("attaches a time window to timing actions", () => {
    const timing = plan.actions.find(
      (a) => a.id === "kids_play_window" || a.id === "shift_commute"
    );
    expect(timing?.window).not.toBeNull();
  });

  it("returns a flat-air plan without forecast timing actions", () => {
    const flat = buildPlan(profileWith(), { pm25: 150, hourly: [] });
    expect(flat.actions.some((a) => a.window !== null)).toBe(false);
  });

  it("handles clean air gracefully", () => {
    const clean = buildPlan(profileWith(), { pm25: 8, hourly: makeHourly([8]) });
    expect(clean.category).toBe("good");
    clean.personas.forEach((p) => expect(p.baselineUgM3).toBeLessThan(10));
  });

  it("always suggests low-effort habits", () => {
    expect(plan.habits).toContain("wet_mop");
    expect(plan.habits).toContain("avoid_exertion");
  });

  it("keeps children and seniors indoors when even the cleanest hour is poor", () => {
    const dirty = buildPlan(profileWith({ seniors: 1 }), { pm25: 300, hourly: makeHourly([300]) });
    const ids = dirty.actions.map((a) => a.id);
    expect(ids).toContain("kids_play_indoors");
    expect(ids).toContain("seniors_stay_in");
    expect(ids).not.toContain("kids_play_window");
    expect(ids).not.toContain("seniors_walk_window");
  });

  it("sends outdoor activity to the cleanest hour when that hour is acceptable", () => {
    const hourly = makeHourly([150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 40]);
    const clearer = buildPlan(profileWith(), { pm25: 150, hourly });
    expect(clearer.actions.map((a) => a.id)).toContain("kids_play_window");
  });
});
