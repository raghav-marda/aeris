import { describe, expect, it } from "vitest";
import {
  baselineInputs,
  dailyAverageExposure,
  dayMeanPm25,
  findBestWindow,
  type ExposureInputs,
} from "../lib/exposure/engine";
import { makeHourly, profileWith, smogDay } from "./fixtures";

const OUTDOORS_ALL_DAY: ExposureInputs = {
  commute: { minutes: 0, pm25: 100, exposureFactor: 1, maskReduction: 0 },
  outdoor: { minutes: 1440, pm25: 100, exposureFactor: 1, maskReduction: 0 },
  indoor: { dayMeanPm25: 100, infiltration: 0.6, purifierHours: 0 },
};

describe("dailyAverageExposure", () => {
  it("equals the outdoor level for someone outside all day", () => {
    expect(dailyAverageExposure(OUTDOORS_ALL_DAY)).toBe(100);
  });

  it("equals the infiltrated level for someone indoors all day", () => {
    const indoors = { ...OUTDOORS_ALL_DAY, outdoor: { ...OUTDOORS_ALL_DAY.outdoor, minutes: 0 } };
    expect(dailyAverageExposure(indoors)).toBe(60);
  });

  it("is lower with a purifier running", () => {
    const base = { ...OUTDOORS_ALL_DAY, outdoor: { ...OUTDOORS_ALL_DAY.outdoor, minutes: 0 } };
    const purified = { ...base, indoor: { ...base.indoor, purifierHours: 8 } };
    expect(dailyAverageExposure(purified)).toBeLessThan(dailyAverageExposure(base));
  });

  it("is lower when a mask is worn during the commute", () => {
    const commuting = {
      ...OUTDOORS_ALL_DAY,
      commute: { ...OUTDOORS_ALL_DAY.commute, minutes: 60 },
    };
    const masked = { ...commuting, commute: { ...commuting.commute, maskReduction: 0.5 } };
    expect(dailyAverageExposure(masked)).toBeLessThan(dailyAverageExposure(commuting));
  });
});

describe("dayMeanPm25", () => {
  it("averages the hourly forecast", () => {
    expect(dayMeanPm25({ pm25: 10, hourly: makeHourly([100, 200]) })).toBe(150);
  });

  it("falls back to the current reading without a forecast", () => {
    expect(dayMeanPm25({ pm25: 80, hourly: [] })).toBe(80);
  });
});

describe("baselineInputs", () => {
  it("gives a work-from-home adult no commute time", () => {
    const profile = profileWith({ commuteMode: "work_from_home" });
    expect(baselineInputs("adult", profile, smogDay()).commute.minutes).toBe(0);
  });

  it("only commutes for the adult persona", () => {
    expect(baselineInputs("child", profileWith(), smogDay()).commute.minutes).toBe(0);
  });

  it("uses the child outdoor minutes from the profile", () => {
    const profile = profileWith({ childOutdoorMinutes: 90 });
    expect(baselineInputs("child", profile, smogDay()).outdoor.minutes).toBe(90);
  });
});

describe("findBestWindow", () => {
  const hourly = makeHourly([200, 150, 90, 80, 120], 8, 5);

  it("finds the cleanest consecutive hours", () => {
    expect(findBestWindow(hourly, 2, { start: 0, end: 24 })).toEqual({
      startHour: 10,
      endHour: 12,
      meanPm25: 85,
    });
  });

  it("respects the allowed hour range", () => {
    const window = findBestWindow(hourly, 1, { start: 8, end: 10 });
    expect(window?.startHour).toBe(9);
  });

  it("returns null when no window fits", () => {
    expect(findBestWindow(hourly, 6, { start: 0, end: 24 })).toBeNull();
  });

  it("does not stitch together hours that are not consecutive", () => {
    const gapped = [
      { hour: 8, pm25: 10 },
      { hour: 12, pm25: 10 },
    ];
    expect(findBestWindow(gapped, 2, { start: 0, end: 24 })).toBeNull();
  });
});
