// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import AerisApp from "../components/AerisApp";
import { fallbackNarration } from "../lib/ai/narrate";
import { buildPlan } from "../lib/exposure/planner";
import { DEFAULT_PROFILE } from "../lib/exposure/profile";
import { smogDay } from "./fixtures";

const hourly = smogDay().hourly.slice(0, 6);
const livePlan = buildPlan(DEFAULT_PROFILE, { pm25: 180, hourly });

const LIVE_AIR = {
  place: { name: "Delhi", region: "Delhi", country: "India", latitude: 28.61, longitude: 77.21 },
  pm25: 180,
  observedAt: "2026-11-17T10:15",
  hourly,
  aqi: 346,
  category: "veryPoor",
};

const EMPTY_INTAKE = {
  adults: null,
  children: null,
  seniors: null,
  sensitiveMember: null,
  commuteMode: null,
  commuteMinutes: null,
  transitAvailable: null,
  childOutdoorMinutes: null,
  windows: null,
  hasPurifier: null,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

type Routes = Record<string, (init?: RequestInit) => Response>;

/** Routes the app's own API calls; unknown routes fail like a down server. */
function stubApi(routes: Routes) {
  const handler = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const match = Object.keys(routes).find((prefix) => url.includes(prefix));
    return match ? routes[match](init) : json({}, 500);
  });
  vi.stubGlobal("fetch", handler);
  return handler;
}

const bodyOf = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string);

const planRoute =
  (language: "en" | "hi" = "en") =>
  () =>
    json({ plan: livePlan, narration: fallbackNarration(livePlan, language) });

async function loadLiveAir(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/city or area/i), "Delhi");
  await user.click(screen.getByRole("button", { name: /check air/i }));
  await screen.findByText(/showing air for delhi/i);
}

beforeEach(() => window.localStorage.clear());

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.className = "";
});

describe("live air", () => {
  it("shows the live reading, chart and an equivalent data table", async () => {
    stubApi({ "/api/air": () => json(LIVE_AIR) });
    const user = userEvent.setup();
    const { container } = render(<AerisApp />);

    await loadLiveAir(user);
    expect(screen.getByRole("img", { name: /pm2\.5 hour by hour/i })).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(hourly.length + 1);
    expect(screen.getByText(/open-meteo/i)).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });

  it("looks up the air for the device location", async () => {
    const api = stubApi({ "/api/air": () => json(LIVE_AIR) });
    const getCurrentPosition = vi.fn((success: PositionCallback) =>
      success({ coords: { latitude: 28.6139, longitude: 77.209 } } as GeolocationPosition)
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
    const user = userEvent.setup();
    render(<AerisApp />);

    await user.click(screen.getByRole("button", { name: /use my location/i }));
    await screen.findByText(/showing air for delhi/i);
    expect(String(api.mock.calls[0][0])).toContain("lat=28.61&lon=77.21");
  });

  it("explains when location access is refused", async () => {
    const getCurrentPosition = vi.fn((_: PositionCallback, failure: PositionErrorCallback) =>
      failure({} as GeolocationPositionError)
    );
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
    const user = userEvent.setup();
    render(<AerisApp />);

    await user.click(screen.getByRole("button", { name: /use my location/i }));
    expect((await screen.findByRole("status")).textContent).toMatch(
      /location access was not allowed/i
    );
  });
});

describe("household form", () => {
  it("sends the edited profile with the plan request", async () => {
    const api = stubApi({ "/api/air": () => json(LIVE_AIR), "/api/plan": planRoute() });
    const user = userEvent.setup();
    render(<AerisApp />);
    await loadLiveAir(user);

    const children = screen.getByLabelText("Children");
    await user.clear(children);
    await user.type(children, "3");
    await user.selectOptions(screen.getByLabelText(/how you usually commute/i), "car");
    await user.click(screen.getByLabelText(/already run an air purifier/i));
    await user.click(screen.getByLabelText("Closed"));
    await user.click(screen.getByRole("button", { name: /build my plan/i }));
    await screen.findByRole("heading", { name: /your plan/i });

    const planCall = api.mock.calls.find(([url]) => String(url).includes("/api/plan"));
    expect(bodyOf(planCall as unknown[]).profile).toMatchObject({
      children: 3,
      commuteMode: "car",
      hasPurifier: true,
      windows: "closed",
    });
  });

  it("clamps member counts to the allowed range", async () => {
    stubApi({ "/api/air": () => json(LIVE_AIR) });
    const user = userEvent.setup();
    render(<AerisApp />);
    await loadLiveAir(user);

    const adults = screen.getByLabelText("Adults") as HTMLInputElement;
    await user.clear(adults);
    await user.type(adults, "99");
    expect(adults.value).toBe("10");
  });

  it("disables planning for an empty household", async () => {
    stubApi({ "/api/air": () => json(LIVE_AIR) });
    const user = userEvent.setup();
    render(<AerisApp />);
    await loadLiveAir(user);

    for (const label of ["Adults", "Children"]) {
      const field = screen.getByLabelText(label);
      await user.clear(field);
      await user.type(field, "0");
    }
    const seniors = screen.getByLabelText(/seniors/i);
    await user.clear(seniors);
    await user.type(seniors, "0");
    expect(
      (screen.getByRole("button", { name: /build my plan/i }) as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it("fills the form from a free-text description", async () => {
    stubApi({
      "/api/air": () => json(LIVE_AIR),
      "/api/intake": () => json({ intake: { ...EMPTY_INTAKE, children: 4 }, source: "ai" }),
    });
    const user = userEvent.setup();
    render(<AerisApp />);
    await loadLiveAir(user);

    await user.type(screen.getByLabelText(/describe your routine/i), "two adults and four kids");
    await user.click(screen.getByRole("button", { name: /fill the form with ai/i }));
    await vi.waitFor(() =>
      expect((screen.getByLabelText("Children") as HTMLInputElement).value).toBe("4")
    );
  });

  it("keeps the form usable when the description cannot be read", async () => {
    stubApi({ "/api/air": () => json(LIVE_AIR) });
    const user = userEvent.setup();
    render(<AerisApp />);
    await loadLiveAir(user);

    await user.type(screen.getByLabelText(/describe your routine/i), "something unclear");
    await user.click(screen.getByRole("button", { name: /fill the form with ai/i }));
    expect((await screen.findByText(/could not read that/i)).textContent).toBeTruthy();
  });
});

describe("plan follow-ups", () => {
  async function reachPlan(user: ReturnType<typeof userEvent.setup>) {
    await loadLiveAir(user);
    await user.click(screen.getByRole("button", { name: /build my plan/i }));
    await screen.findByRole("heading", { name: /your plan/i });
  }

  it("regenerates the explanation when the language changes", async () => {
    const api = stubApi({ "/api/air": () => json(LIVE_AIR), "/api/plan": planRoute("hi") });
    const user = userEvent.setup();
    render(<AerisApp />);
    await reachPlan(user);

    await user.click(screen.getByRole("button", { name: "हिन्दी" }));
    await screen.findByRole("heading", { name: /आपकी योजना/ });
    const planCalls = api.mock.calls.filter(([url]) => String(url).includes("/api/plan"));
    expect(bodyOf(planCalls.at(-1) as unknown[]).language).toBe("hi");
  });

  it("answers typed questions and reports failures", async () => {
    let fail = false;
    stubApi({
      "/api/air": () => json(LIVE_AIR),
      "/api/plan": planRoute(),
      "/api/ask": () =>
        fail ? json({}, 502) : json({ answer: "Keep the windows shut.", source: "ai" }),
    });
    const user = userEvent.setup();
    render(<AerisApp />);
    await reachPlan(user);

    const question = screen.getByLabelText(/ask a question about your plan/i);
    await user.type(question, "Should I open windows?");
    await user.click(screen.getByRole("button", { name: /^ask$/i }));
    expect(await screen.findByText("Keep the windows shut.")).toBeTruthy();

    fail = true;
    await user.click(screen.getByRole("button", { name: /^ask$/i }));
    const askSection = screen.getByRole("region", { name: /ask aeris/i });
    expect(
      (await within(askSection).findByText(/could not answer right now/i)).textContent
    ).toBeTruthy();
  });
});
