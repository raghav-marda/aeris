import { en } from "./en";
import { hi } from "./hi";
import type { Language, Messages } from "./types";

export { LANGUAGES } from "./types";
export type { Language, Messages } from "./types";

const CATALOGUES: Readonly<Record<Language, Messages>> = { en, hi };

export function getMessages(language: Language): Messages {
  return CATALOGUES[language];
}

/** Formats a local hour (0-23) as "HH:00". */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
