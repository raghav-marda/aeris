/**
 * Live air quality from Open-Meteo (free, no API key; CAMS atmospheric model
 * data). Values are modelled grid estimates, not readings from a station, and
 * the UI says so. Responses are validated and cached to keep calls minimal.
 */
import { z } from "zod";
import { fetchJson, UpstreamError } from "../http";
import { createTtlCache } from "../ttlCache";
import type { HourlyPm25 } from "../exposure/profile";

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

const FORECAST_HOURS = 24;
const FORECAST_DAYS = 2;
const AIR_CACHE_TTL_MS = 10 * 60_000;
const GEO_CACHE_TTL_MS = 24 * 60 * 60_000;
const CACHE_MAX_ENTRIES = 200;
const COORDINATE_PRECISION = 2;

export interface Place {
  readonly name: string;
  readonly region: string | null;
  readonly country: string | null;
  readonly latitude: number;
  readonly longitude: number;
}

export interface AirSnapshot {
  readonly place: Place;
  readonly pm25: number;
  readonly observedAt: string;
  readonly hourly: readonly HourlyPm25[];
}

const GeocodeSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        admin1: z.string().optional(),
        country: z.string().optional(),
      })
    )
    .optional(),
});

const AirSchema = z.object({
  current: z.object({ time: z.string(), pm2_5: z.number().nullable() }),
  hourly: z.object({ time: z.array(z.string()), pm2_5: z.array(z.number().nullable()) }),
});

const geoCache = createTtlCache<Place>(GEO_CACHE_TTL_MS, CACHE_MAX_ENTRIES);
const airCache = createTtlCache<AirSnapshot>(AIR_CACHE_TTL_MS, CACHE_MAX_ENTRIES);

/** Looks up the best-matching place for a city name. */
export async function geocodeCity(query: string): Promise<Place> {
  const key = query.trim().toLowerCase();
  const cached = geoCache.get(key);
  if (cached) return cached;

  const url = `${GEOCODE_URL}?${new URLSearchParams({
    name: query.trim(),
    count: "1",
    language: "en",
    format: "json",
  })}`;
  const { results } = await fetchJson(url, GeocodeSchema);
  const first = results?.[0];
  if (!first) throw new UpstreamError("No matching place was found.", 404);

  const place: Place = {
    name: first.name,
    region: first.admin1 ?? null,
    country: first.country ?? null,
    latitude: first.latitude,
    longitude: first.longitude,
  };
  geoCache.set(key, place);
  return place;
}

/** Local hour of day from an Open-Meteo ISO time such as "2026-11-17T14:00". */
const hourOf = (isoTime: string): number => Number.parseInt(isoTime.slice(11, 13), 10);

/** Next 24 hourly values starting at the current hour, skipping missing data. */
export function upcomingHours(
  hourly: z.infer<typeof AirSchema>["hourly"],
  currentTime: string
): HourlyPm25[] {
  const currentHour = `${currentTime.slice(0, 13)}:00`;
  const result: HourlyPm25[] = [];
  hourly.time.forEach((time, index) => {
    const pm25 = hourly.pm2_5[index];
    if (time >= currentHour && pm25 !== null && pm25 !== undefined) {
      result.push({ hour: hourOf(time), pm25 });
    }
  });
  return result.slice(0, FORECAST_HOURS);
}

/** Fetches current and forecast PM2.5 for coordinates. */
export async function fetchAirSnapshot(place: Place): Promise<AirSnapshot> {
  const lat = place.latitude.toFixed(COORDINATE_PRECISION);
  const lon = place.longitude.toFixed(COORDINATE_PRECISION);
  const cacheKey = `${lat},${lon}`;
  const cached = airCache.get(cacheKey);
  if (cached) return { ...cached, place };

  const url = `${AIR_URL}?${new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "pm2_5",
    hourly: "pm2_5",
    forecast_days: String(FORECAST_DAYS),
    timezone: "auto",
  })}`;
  const data = await fetchJson(url, AirSchema);

  const hourly = upcomingHours(data.hourly, data.current.time);
  const pm25 = data.current.pm2_5 ?? hourly[0]?.pm25;
  if (pm25 === undefined) throw new UpstreamError("No air quality data is available here.");

  const snapshot: AirSnapshot = { place, pm25, observedAt: data.current.time, hourly };
  airCache.set(cacheKey, snapshot);
  return snapshot;
}
