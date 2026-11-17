import { describe, expect, it } from "vitest";
import {
  collectNumbers,
  extractNumbers,
  findUnsupportedNumbers,
  normalizeNumber,
} from "../lib/ai/numberGuard";

describe("collectNumbers", () => {
  it("collects numeric values at any depth", () => {
    const allowed = collectNumbers({ a: 12.5, nested: [{ b: 3 }] });
    expect([...allowed].sort()).toEqual(["0", "12.5", "3"]);
  });

  it("reads numbers from *Label strings only", () => {
    const allowed = collectNumbers({ windowLabel: "13:00 to 14:00", id: "wear_n95_commute" });
    expect(allowed.has("13")).toBe(true);
    expect(allowed.has("14")).toBe(true);
    expect(allowed.has("95")).toBe(false);
  });

  it("always allows zero", () => {
    expect(collectNumbers({}).has("0")).toBe(true);
  });
});

describe("extractNumbers", () => {
  it("ignores digits attached to letters", () => {
    expect(extractNumbers("Wear an N95 for PM2.5 days")).toEqual([]);
  });

  it("normalises formatting", () => {
    expect(extractNumbers("about 7.50 and 08")).toEqual(["7.5", "8"]);
  });

  it("reads Devanagari digits so Hindi cannot hide figures", () => {
    expect(extractNumbers("लगभग १२५ µg")).toEqual(["125"]);
  });
});

describe("findUnsupportedNumbers", () => {
  const allowed = new Set(["0", "166.1", "13"]);

  it("accepts text that only repeats known figures", () => {
    expect(findUnsupportedNumbers("Exposure is 166.1 at 13:00", allowed)).toEqual([]);
  });

  it("flags invented figures once each", () => {
    expect(findUnsupportedNumbers("That is 9 cigarettes, yes 9", allowed)).toEqual(["9"]);
  });
});

describe("normalizeNumber", () => {
  it("strips trailing zeros", () => {
    expect(normalizeNumber("3.0")).toBe("3");
  });
});
