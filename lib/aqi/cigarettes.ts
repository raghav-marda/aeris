/**
 * Cigarette equivalence: Berkeley Earth's rough rule of thumb is that
 * breathing about 22 µg/m³ of PM2.5 for a day is comparable to smoking one
 * cigarette. It is based on mortality effects, is approximate, and is used
 * here only to make exposure easier to grasp.
 */
export const PM25_UG_M3_PER_CIGARETTE = 22;

/** Cigarettes-per-day equivalent of a 24-hour average PM2.5, to one decimal. */
export function cigarettesPerDay(avgPm25: number): number {
  const value = Math.max(0, avgPm25) / PM25_UG_M3_PER_CIGARETTE;
  return Math.round(value * 10) / 10;
}
