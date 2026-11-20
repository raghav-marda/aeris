// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLocalStorageState } from "../lib/useLocalStorageState";

const FALLBACK: Record<string, boolean> = {};

const isBooleanRecord = (value: unknown): value is Record<string, boolean> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((entry) => typeof entry === "boolean");

afterEach(() => window.localStorage.clear());

describe("useLocalStorageState", () => {
  it("returns the fallback when nothing is stored", () => {
    const { result } = renderHook(() => useLocalStorageState("k1", FALLBACK, isBooleanRecord));
    expect(result.current[0]).toBe(FALLBACK);
  });

  it("returns a referentially stable value once data is stored (no render loop)", () => {
    window.localStorage.setItem("k2", JSON.stringify({ a: true }));
    let renders = 0;
    const { result, rerender } = renderHook(() => {
      renders++;
      return useLocalStorageState<Record<string, boolean>>("k2", FALLBACK, isBooleanRecord);
    });
    const first = result.current[0];
    rerender();
    expect(result.current[0]).toBe(first);
    expect(first).toEqual({ a: true });
    expect(renders).toBeLessThan(10);
  });

  it("persists updates and re-renders with the new value", () => {
    const { result } = renderHook(() =>
      useLocalStorageState<Record<string, boolean>>("k3", FALLBACK, isBooleanRecord)
    );
    act(() => result.current[1]((prev) => ({ ...prev, x: true })));
    expect(result.current[0]).toEqual({ x: true });
    expect(JSON.parse(window.localStorage.getItem("k3")!)).toEqual({ x: true });
  });

  it("falls back on corrupt stored JSON", () => {
    window.localStorage.setItem("k4", "{not json");
    const { result } = renderHook(() => useLocalStorageState("k4", FALLBACK, isBooleanRecord));
    expect(result.current[0]).toBe(FALLBACK);
  });

  it("ignores stored data that fails validation", () => {
    window.localStorage.setItem("k5", JSON.stringify({ a: "not a boolean" }));
    const { result } = renderHook(() => useLocalStorageState("k5", FALLBACK, isBooleanRecord));
    expect(result.current[0]).toBe(FALLBACK);
  });
});
