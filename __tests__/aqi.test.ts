import { describe, expect, it } from "vitest";
import { categorizePm25, pm25ToAqi } from "../lib/aqi/cpcb";
import { cigarettesPerDay } from "../lib/aqi/cigarettes";

describe("categorizePm25", () => {
  it.each([
    [0, "good"],
    [30, "good"],
    [45, "satisfactory"],
    [75, "moderate"],
    [100, "poor"],
    [200, "veryPoor"],
    [300, "severe"],
  ] as const)("maps %s µg/m³ to %s", (pm25, category) => {
    expect(categorizePm25(pm25)).toBe(category);
  });

  it("treats negative values as clean air", () => {
    expect(categorizePm25(-5)).toBe("good");
  });
});

describe("pm25ToAqi", () => {
  it("returns the band edges exactly", () => {
    expect(pm25ToAqi(0)).toBe(0);
    expect(pm25ToAqi(30)).toBe(50);
    expect(pm25ToAqi(60)).toBe(100);
    expect(pm25ToAqi(90)).toBe(200);
    expect(pm25ToAqi(120)).toBe(300);
  });

  it("increases monotonically", () => {
    const samples = [0, 20, 45, 75, 100, 150, 250, 300, 380];
    const indices = samples.map(pm25ToAqi);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });

  it("caps at 500", () => {
    expect(pm25ToAqi(2000)).toBe(500);
  });
});

describe("cigarettesPerDay", () => {
  it("is one cigarette at 22 µg/m³", () => {
    expect(cigarettesPerDay(22)).toBe(1);
  });

  it("scales linearly and rounds to one decimal", () => {
    expect(cigarettesPerDay(44)).toBe(2);
    expect(cigarettesPerDay(100)).toBe(4.5);
  });

  it("never goes below zero", () => {
    expect(cigarettesPerDay(-10)).toBe(0);
  });
});
