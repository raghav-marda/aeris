/** Typed wrappers around Aeris's own API routes, used by the browser. */
import type { Answer } from "../ai/ask";
import type { IntakeResult } from "../ai/intake";
import { categorizePm25, pm25ToAqi } from "../aqi/cpcb";
import type { Profile } from "../exposure/profile";
import type { Language } from "../i18n";
import type { AirData, PlanResponse } from "./types";

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`Request failed with status ${status}`);
    this.name = "ApiError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new ApiError(response.status);
  return (await response.json()) as T;
}

const postJson = <T>(url: string, body: unknown): Promise<T> =>
  request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

type AirLookup = { readonly city: string } | { readonly lat: number; readonly lon: number };

export async function fetchAir(lookup: AirLookup): Promise<AirData> {
  const params = new URLSearchParams(
    Object.entries(lookup).map(([key, value]) => [key, String(value)])
  );
  const data = await request<Omit<AirData, "source"> & { place: AirData["place"] }>(
    `/api/air?${params}`
  );
  return { ...data, source: "model" };
}

/** Builds air data from a reading typed in by the user. */
export function manualAir(pm25: number): AirData {
  return {
    place: null,
    pm25,
    hourly: [],
    aqi: pm25ToAqi(pm25),
    category: categorizePm25(pm25),
    source: "manual",
  };
}

const airPayload = (air: AirData) => ({ pm25: air.pm25, hourly: air.hourly });

export const requestPlan = (profile: Profile, air: AirData, language: Language) =>
  postJson<PlanResponse>("/api/plan", { profile, air: airPayload(air), language });

export const requestAnswer = (
  profile: Profile,
  air: AirData,
  language: Language,
  question: string
) => postJson<Answer>("/api/ask", { profile, air: airPayload(air), language, question });

export const requestIntake = (text: string) => postJson<IntakeResult>("/api/intake", { text });
