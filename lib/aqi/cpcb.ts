/**
 * India's National Air Quality Index (CPCB) categories for PM2.5.
 *
 * Breakpoints are the 24-hour PM2.5 bands published by the Central Pollution
 * Control Board. Live data used by Aeris is an hourly model value, so the
 * resulting index is an *indicative* reading, not an official station AQI.
 */

export type AqiCategory = "good" | "satisfactory" | "moderate" | "poor" | "veryPoor" | "severe";

interface Band {
  readonly category: AqiCategory;
  readonly pm25Low: number;
  readonly pm25High: number;
  readonly aqiLow: number;
  readonly aqiHigh: number;
}

/**
 * Upper PM2.5 value used when interpolating inside the "severe" band. CPCB
 * lists the band as "250+"; the index is capped at 500 beyond this value.
 */
const SEVERE_INTERPOLATION_CEILING = 380;
const MAX_AQI = 500;

const LOWEST_BAND: Band = { category: "good", pm25Low: 0, pm25High: 30, aqiLow: 0, aqiHigh: 50 };

export const CPCB_PM25_BANDS: readonly Band[] = [
  LOWEST_BAND,
  { category: "satisfactory", pm25Low: 31, pm25High: 60, aqiLow: 51, aqiHigh: 100 },
  { category: "moderate", pm25Low: 61, pm25High: 90, aqiLow: 101, aqiHigh: 200 },
  { category: "poor", pm25Low: 91, pm25High: 120, aqiLow: 201, aqiHigh: 300 },
  { category: "veryPoor", pm25Low: 121, pm25High: 250, aqiLow: 301, aqiHigh: 400 },
  {
    category: "severe",
    pm25Low: 251,
    pm25High: SEVERE_INTERPOLATION_CEILING,
    aqiLow: 401,
    aqiHigh: MAX_AQI,
  },
];

/** PM2.5 (µg/m³) at which air is first "moderately polluted" under CPCB. */
export const MODERATE_PM25_THRESHOLD = 61;

/** PM2.5 (µg/m³) at which air is first "poor" under CPCB. */
export const POOR_PM25_THRESHOLD = 91;

/** Finds the band for a PM2.5 value, treating gaps between bands as the lower band. */
function findBand(pm25: number): Band {
  const value = Math.max(0, pm25);
  const match = [...CPCB_PM25_BANDS].reverse().find((band) => value >= band.pm25Low);
  return match ?? LOWEST_BAND;
}

export function categorizePm25(pm25: number): AqiCategory {
  return findBand(pm25).category;
}

/** Linear sub-index interpolation used by CPCB, rounded to a whole number. */
export function pm25ToAqi(pm25: number): number {
  const value = Math.max(0, pm25);
  const band = findBand(value);
  const span = band.pm25High - band.pm25Low;
  const ratio = span === 0 ? 0 : (value - band.pm25Low) / span;
  const aqi = band.aqiLow + ratio * (band.aqiHigh - band.aqiLow);
  return Math.min(MAX_AQI, Math.round(aqi));
}
