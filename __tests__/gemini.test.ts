import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generateStructured } from "../lib/ai/gemini";
import { generateGrounded } from "../lib/ai/grounded";
import { UpstreamError } from "../lib/http";

const schema = z.object({ answer: z.string() });

/** Fakes the Gemini REST envelope around the given model text. */
function geminiResponse(text: string, status = 200): Response {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status,
  });
}

const request = { system: "s", user: "u", schema, maxOutputTokens: 100 };

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("generateStructured", () => {
  it("returns validated JSON and sends the key as a header, not in the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse('{"answer":"ok"}'));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateStructured(request)).resolves.toEqual({ answer: "ok" });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).not.toContain("test-key");
    expect(init?.headers["x-goog-api-key"]).toBe("test-key");
  });

  it("throws when the key is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(generateStructured(request)).rejects.toBeInstanceOf(UpstreamError);
  });

  it("rejects non-JSON model text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiResponse("not json")));
    await expect(generateStructured(request)).rejects.toThrow(/valid JSON/);
  });

  it("rejects JSON of the wrong shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiResponse('{"nope":1}')));
    await expect(generateStructured(request)).rejects.toThrow(/unexpected shape/);
  });

  it("surfaces HTTP errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 429 })));
    await expect(generateStructured(request)).rejects.toMatchObject({ status: 429 });
  });

  it("surfaces network failures as upstream errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(generateStructured(request)).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe("generateGrounded", () => {
  const grounded = {
    ...request,
    allowedNumbers: new Set(["0", "42"]),
    textOf: (value: { answer: string }) => value.answer,
  };

  it("accepts replies that only use allowed numbers", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiResponse('{"answer":"It is 42."}')));
    await expect(generateGrounded(grounded)).resolves.toEqual({ answer: "It is 42." });
  });

  it("asks the model to repair a reply with invented numbers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(geminiResponse('{"answer":"It is 99."}'))
      .mockResolvedValueOnce(geminiResponse('{"answer":"It is 42."}'));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateGrounded(grounded)).resolves.toEqual({ answer: "It is 42." });
    const repairBody = JSON.parse(fetchMock.mock.calls[1]?.[1].body);
    expect(repairBody.contents[0].parts[0].text).toContain("99");
  });

  it("gives up after the repair attempt also invents numbers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => geminiResponse('{"answer":"It is 99."}'))
    );
    await expect(generateGrounded(grounded)).rejects.toThrow(/not part of the plan/);
  });
});
