import {
  DEFAULT_PROFILE,
  type AirReading,
  type HourlyPm25,
  type Profile,
} from "../lib/exposure/profile";

/** Builds 24 hourly readings starting at `startHour`, cycling through `values`. */
export function makeHourly(values: readonly number[], startHour = 0, length = 24): HourlyPm25[] {
  return Array.from({ length }, (_, i) => ({
    hour: (startHour + i) % 24,
    pm25: values[i % values.length],
  }));
}

/** Smog-like day: dirty overnight and morning, cleanest mid-afternoon. */
export function smogDay(): AirReading {
  const shape = [
    220, 230, 240, 250, 250, 240, 220, 200, 180, 150, 130, 110, 100, 95, 100, 110, 130, 160, 190,
    210, 220, 225, 225, 220,
  ];
  return { pm25: 180, hourly: makeHourly(shape, 0) };
}

export function profileWith(overrides: Partial<Profile> = {}): Profile {
  return { ...DEFAULT_PROFILE, ...overrides };
}
