import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getAir } from "../app/api/air/route";
import { POST as postAsk } from "../app/api/ask/route";
import { POST as postIntake } from "../app/api/intake/route";
import { POST as postPlan } from "../app/api/plan/route";
import { DEFAULT_PROFILE } from "../lib/exposure/profile";

let ipCounter = 0;
/** Each test uses a fresh client IP so rate limit buckets never collide. */
const freshIp = () => `10.0.0.${++ipCounter}`;

function post(body: unknown, ip = freshIp(), raw?: string): Request {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: raw ?? JSON.stringify(body),
  });
}

const air = {
  pm25: 150,
  hourly: [
    { hour: 12, pm25: 100 },
    { hour: 13, pm25: 90 },
  ],
};
const validPlanBody = { profile: DEFAULT_PROFILE, air, language: "en" };

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/plan", () => {
  it("returns a plan and narration", async () => {
    const response = await postPlan(post(validPlanBody));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.plan.actions.length).toBeGreaterThan(0);
    expect(data.narration.source).toBe("fallback");
  });

  it("rejects an invalid profile", async () => {
    const body = { ...validPlanBody, profile: { ...DEFAULT_PROFILE, adults: -1 } };
    expect((await postPlan(post(body))).status).toBe(400);
  });

  it("rejects unknown keys", async () => {
    expect((await postPlan(post({ ...validPlanBody, extra: true }))).status).toBe(400);
  });

  it("rejects malformed JSON", async () => {
    expect((await postPlan(post(null, freshIp(), "{nope"))).status).toBe(400);
  });

  it("rejects oversized bodies", async () => {
    const huge = JSON.stringify({ padding: "x".repeat(25_000) });
    expect((await postPlan(post(null, freshIp(), huge))).status).toBe(413);
  });

  it("measures the body limit in bytes, not characters", async () => {
    // 8,000 three-byte characters are 24,000 bytes but only 8,000 characters.
    const wide = JSON.stringify({ padding: "\u20ac".repeat(8_000) });
    expect((await postPlan(post(null, freshIp(), wide))).status).toBe(413);
  });

  it("tells a rate-limited client when to retry", async () => {
    const ip = freshIp();
    let last = await postPlan(post(validPlanBody, ip));
    for (let i = 0; i < 13; i++) last = await postPlan(post(validPlanBody, ip));
    expect(last.status).toBe(429);
    const retryAfter = Number(last.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it("rate limits a single client", async () => {
    const ip = freshIp();
    const statuses: number[] = [];
    for (let i = 0; i < 14; i++) statuses.push((await postPlan(post(validPlanBody, ip))).status);
    expect(statuses.slice(0, 12).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it("does not leak internal error details", async () => {
    const response = await postPlan(post({ nonsense: true }));
    expect(JSON.stringify(await response.json())).toBe('{"error":"Invalid request."}');
  });
});

describe("POST /api/ask", () => {
  it("answers using the fallback when AI is unavailable", async () => {
    const response = await postAsk(post({ ...validPlanBody, question: "What should I do first?" }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.source).toBe("fallback");
  });

  it("rejects very short and very long questions", async () => {
    expect((await postAsk(post({ ...validPlanBody, question: "hi" }))).status).toBe(400);
    const long = { ...validPlanBody, question: "x".repeat(301) };
    expect((await postAsk(post(long))).status).toBe(400);
  });
});

describe("POST /api/intake", () => {
  it("extracts fields with the keyword fallback", async () => {
    const response = await postIntake(post({ text: "2 adults, I take the metro 30 minutes" }));
    const data = await response.json();
    expect(data.intake).toMatchObject({ adults: 2, commuteMode: "metro", commuteMinutes: 30 });
  });

  it("rejects empty text", async () => {
    expect((await postIntake(post({ text: "  " }))).status).toBe(400);
  });
});

describe("GET /api/air", () => {
  const airRequest = (query: string) =>
    new Request(`http://localhost/api/air?${query}`, { headers: { "x-forwarded-for": freshIp() } });

  it("rejects missing and out-of-range parameters", async () => {
    expect((await getAir(airRequest(""))).status).toBe(400);
    expect((await getAir(airRequest("lat=95&lon=10"))).status).toBe(400);
    expect((await getAir(airRequest("city=x"))).status).toBe(400);
  });

  it("returns a snapshot with AQI and category for coordinates", async () => {
    const payload = {
      current: { time: "2026-11-17T10:15", pm2_5: 130 },
      hourly: { time: ["2026-11-17T10:00"], pm2_5: [130] },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => new Response(JSON.stringify(payload)))
    );

    const response = await getAir(airRequest("lat=28.61&lon=77.21"));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      pm25: 130,
      category: "veryPoor",
      place: { name: "Your location" },
    });
  });

  it("maps an unknown city to 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => new Response("{}"))
    );
    expect((await getAir(airRequest("city=Atlantis"))).status).toBe(404);
  });

  it("maps upstream failure to 502", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await getAir(airRequest("lat=1.5&lon=2.5"))).status).toBe(502);
  });
});
