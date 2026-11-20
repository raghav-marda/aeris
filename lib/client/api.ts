/** Typed wrappers around Aeris's own API routes, used by the browser. */
import type { z } from "zod";
import { categorizePm25, pm25ToAqi } from "../aqi/cpcb";
import type { Profile } from "../exposure/profile";
import type { Language } from "../i18n";
import { airResponseSchema, answerSchema, intakeResultSchema, planResponseSchema } from "./schemas";
import type { AirData } from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    reason = `Request failed with status ${status}`
  ) {
    super(reason);
    this.name = "ApiError";
  }
}

/** Fetches JSON and parses it with `schema`; a malformed reply is an error, not a cast. */
async function request<S extends z.ZodType>(
  url: string,
  schema: S,
  init?: RequestInit
): Promise<z.output<S>> {
  const response = await fetch(url, init);
  if (!response.ok) throw new ApiError(response.status);
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new ApiError(response.status, "Unexpected response shape");
  return parsed.data;
}

const postJson = <S extends z.ZodType>(url: string, schema: S, body: unknown) =>
  request(url, schema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

type AirLookup = { readonly city: string } | { readonly lat: number; readonly lon: number };

export async function fetchAir(lookup: AirLookup): Promise<AirData> {
  const params = new URLSearchParams(
    Object.entries(lookup).map(([key, value]) => [key, String(value)])
  );
  const data = await request(`/api/air?${params}`, airResponseSchema);
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
  postJson("/api/plan", planResponseSchema, { profile, air: airPayload(air), language });

export const requestAnswer = (
  profile: Profile,
  air: AirData,
  language: Language,
  question: string
) => postJson("/api/ask", answerSchema, { profile, air: airPayload(air), language, question });

export const requestIntake = (text: string) =>
  postJson("/api/intake", intakeResultSchema, { text });
