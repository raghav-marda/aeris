// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import AerisApp from "../components/AerisApp";
import { fallbackNarration } from "../lib/ai/narrate";
import { buildPlan } from "../lib/exposure/planner";
import { DEFAULT_PROFILE } from "../lib/exposure/profile";
import { smogDay } from "./fixtures";

const plan = buildPlan(DEFAULT_PROFILE, { pm25: 180, hourly: smogDay().hourly });

const json = (body: unknown) => new Response(JSON.stringify(body));

/** Routes the app's own API calls to canned responses. */
function stubApi() {
  const handler = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void init;
    const url = String(input);
    if (url.includes("/api/plan")) {
      return json({ plan, narration: fallbackNarration(plan, "en") });
    }
    if (url.includes("/api/ask")) return json({ answer: "Close the windows first.", source: "ai" });
    return new Response("{}", { status: 404 });
  });
  vi.stubGlobal("fetch", handler);
  return handler;
}

async function enterManualReading(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.click(screen.getByRole("button", { name: /enter a pm2\.5 reading manually/i }));
  await user.type(screen.getByLabelText(/pm2\.5 reading/i), value);
  await user.click(screen.getByRole("button", { name: /use this reading/i }));
}

beforeEach(() => window.localStorage.clear());

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.className = "";
});

describe("Aeris app", () => {
  it("has no detectable accessibility violations on first load", async () => {
    const { container } = render(<AerisApp />);
    expect((await axe(container)).violations).toEqual([]);
  });

  it("shows only the location step until air data exists", () => {
    render(<AerisApp />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /household/i })).toBeNull();
  });

  it("walks from a manual reading to a plan and an answer", async () => {
    const api = stubApi();
    const user = userEvent.setup();
    const { container } = render(<AerisApp />);

    await enterManualReading(user, "180");
    expect(screen.getByText(/very poor/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /household/i })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /build my plan/i }));
    const planHeading = await screen.findByRole("heading", { name: /your plan/i });
    await waitFor(() => expect(document.activeElement).toBe(planHeading));
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(3);
    expect(api).toHaveBeenCalledWith("/api/plan", expect.objectContaining({ method: "POST" }));
    expect((await axe(container)).violations).toEqual([]);

    await user.click(screen.getByRole("button", { name: /which single step/i }));
    expect(await screen.findByText("Close the windows first.")).toBeTruthy();
  });

  it("sends only the profile, air reading and language to the plan API", async () => {
    const api = stubApi();
    const user = userEvent.setup();
    render(<AerisApp />);

    await enterManualReading(user, "120");
    await user.click(screen.getByRole("button", { name: /build my plan/i }));
    await screen.findByRole("heading", { name: /your plan/i });

    const planCall = api.mock.calls.find(([url]) => String(url).includes("/api/plan"));
    const body = JSON.parse((planCall?.[1] as RequestInit).body as string);
    expect(Object.keys(body).sort()).toEqual(["air", "language", "profile"]);
    expect(body.air).toEqual({ pm25: 120, hourly: [] });
  });

  it("shows an error when the plan cannot be built", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 502 })));
    const user = userEvent.setup();
    render(<AerisApp />);

    await enterManualReading(user, "120");
    await user.click(screen.getByRole("button", { name: /build my plan/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/could not build the plan/i);
  });

  it("offers manual entry when the live lookup fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 502 })));
    const user = userEvent.setup();
    render(<AerisApp />);

    await user.type(screen.getByLabelText(/city or area/i), "Delhi");
    await user.click(screen.getByRole("button", { name: /check air/i }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/manually/i);
    expect(screen.getByLabelText(/pm2\.5 reading/i)).toBeTruthy();
  });

  it("switches the whole interface to Hindi", async () => {
    const user = userEvent.setup();
    render(<AerisApp />);

    await user.click(screen.getByRole("button", { name: "हिन्दी" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("स्मॉग");
    expect(document.documentElement.lang).toBe("hi");
  });

  it("toggles high contrast and large text", async () => {
    const user = userEvent.setup();
    render(<AerisApp />);
    const region = screen.getByRole("region", { name: /accessibility settings/i });

    await user.click(within(region).getByRole("button", { name: /high contrast/i }));
    await user.click(within(region).getByRole("button", { name: /large text/i }));
    expect(document.documentElement.classList.contains("high-contrast")).toBe(true);
    expect(document.documentElement.classList.contains("large-text")).toBe(true);
  });
});
