import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACTION_IDS } from "../lib/exposure/actions";
import {
  checkRateLimit,
  clientKeyFrom,
  isRateLimited,
  MAX_REQUESTS_PER_WINDOW,
  WINDOW_MS,
} from "../lib/rateLimit";
import { createTtlCache } from "../lib/ttlCache";
import { getMessages, formatHour, LANGUAGES } from "../lib/i18n";
import type { HabitId } from "../lib/exposure/planner";

describe("createTtlCache", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns stored values until they expire", () => {
    const cache = createTtlCache<number>(1000, 10);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    vi.advanceTimersByTime(1001);
    expect(cache.get("a")).toBeUndefined();
  });

  it("evicts the oldest entry at capacity", () => {
    const cache = createTtlCache<number>(1000, 2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
  });

  it("does not evict when overwriting an existing key", () => {
    const cache = createTtlCache<number>(1000, 2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 9);
    expect(cache.get("b")).toBe(2);
    expect(cache.get("a")).toBe(9);
  });
});

describe("rate limiting", () => {
  it("allows a burst then blocks, per key", () => {
    const results = Array.from({ length: 14 }, () => isRateLimited("infra-test"));
    expect(results.slice(0, 12).some(Boolean)).toBe(false);
    expect(results.at(-1)).toBe(true);
    expect(isRateLimited("another-key")).toBe(false);
  });

  it("starts a fresh window once the old one has ended", () => {
    const start = 1_000_000;
    for (let i = 0; i <= MAX_REQUESTS_PER_WINDOW; i++) checkRateLimit("window-test", start);
    expect(checkRateLimit("window-test", start + 1).limited).toBe(true);
    expect(checkRateLimit("window-test", start + WINDOW_MS).limited).toBe(false);
  });

  it("reports how long until the window ends", () => {
    const start = 2_000_000;
    for (let i = 0; i < MAX_REQUESTS_PER_WINDOW; i++) checkRateLimit("retry-test", start);
    const result = checkRateLimit("retry-test", start + 45_000);
    expect(result.limited).toBe(true);
    expect(result.retryAfterSeconds).toBe(15);
  });

  it("keeps memory bounded without evicting a key that is only being reset", () => {
    const start = 3_000_000;
    for (let i = 0; i < 5_000; i++) checkRateLimit(`bound-${i}`, start);
    // Resetting an expired key must not push out an unrelated one.
    checkRateLimit("bound-0", start + WINDOW_MS);
    expect(checkRateLimit("bound-1", start + WINDOW_MS - 1).retryAfterSeconds).toBeLessThanOrEqual(
      60
    );
    // A brand-new key makes room by dropping expired windows, not live ones.
    checkRateLimit("brand-new", start + WINDOW_MS);
    expect(checkRateLimit("brand-new", start + WINDOW_MS).limited).toBe(false);
  });

  it("reads the client from x-forwarded-for", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientKeyFrom(req)).toBe("1.2.3.4");
    expect(clientKeyFrom(new Request("http://x"))).toBe("unknown");
  });
});

const HABIT_IDS: HabitId[] = [
  "wet_mop",
  "no_burning",
  "kitchen_exhaust",
  "no_idling",
  "avoid_exertion",
];

describe("message catalogues", () => {
  it.each(LANGUAGES)("%s defines text for every action and habit", (language) => {
    const { plan } = getMessages(language);
    ACTION_IDS.forEach((id) => {
      expect(plan.actions[id].title.length).toBeGreaterThan(0);
      expect(plan.actions[id].reason.length).toBeGreaterThan(0);
    });
    HABIT_IDS.forEach((id) => expect(plan.habits[id].title.length).toBeGreaterThan(0));
  });

  it("keeps both languages structurally identical", () => {
    const shape = (value: unknown): unknown =>
      value && typeof value === "object"
        ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]))
        : typeof value;
    expect(shape(getMessages("hi"))).toEqual(shape(getMessages("en")));
  });

  it("states the same number of assumptions in each language", () => {
    expect(getMessages("hi").plan.assumptions).toHaveLength(
      getMessages("en").plan.assumptions.length
    );
  });
});

describe("formatHour", () => {
  it("zero-pads hours", () => {
    expect(formatHour(7)).toBe("07:00");
    expect(formatHour(15)).toBe("15:00");
  });
});
