import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, requestAnswer, requestIntake } from "../lib/client/api";
import { DEFAULT_PROFILE } from "../lib/exposure/profile";
import { manualAir } from "../lib/client/api";
import { geminiApiKey, geminiModel } from "../lib/env";

function mockFetch(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => new Response(JSON.stringify(body), { status }))
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("client response validation", () => {
  it("accepts a well-formed reply", async () => {
    mockFetch({ answer: "Start with the mask.", source: "ai" });
    const result = await requestAnswer(DEFAULT_PROFILE, manualAir(200), "en", "What first?");
    expect(result.answer).toBe("Start with the mask.");
  });

  it("rejects a reply with the wrong shape instead of casting it", async () => {
    mockFetch({ unexpected: true });
    await expect(requestIntake("2 adults")).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects a reply with a disallowed enum value", async () => {
    mockFetch({ answer: "x", source: "robot" });
    await expect(
      requestAnswer(DEFAULT_PROFILE, manualAir(200), "en", "What first?")
    ).rejects.toThrow("Unexpected response shape");
  });

  it("raises an ApiError carrying the HTTP status", async () => {
    mockFetch({}, 429);
    await expect(requestIntake("2 adults")).rejects.toMatchObject({ status: 429 });
  });
});

describe("env", () => {
  it("treats a blank key as not configured", () => {
    vi.stubEnv("GEMINI_API_KEY", "   ");
    expect(geminiApiKey()).toBeNull();
  });

  it("returns a trimmed key", () => {
    vi.stubEnv("GEMINI_API_KEY", " abc ");
    expect(geminiApiKey()).toBe("abc");
  });

  it("falls back to the default model when unset or malformed", () => {
    vi.stubEnv("GEMINI_MODEL", "bad model/../x");
    expect(geminiModel()).toBe("gemini-2.5-flash");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-pro");
    expect(geminiModel()).toBe("gemini-2.5-pro");
  });
});
