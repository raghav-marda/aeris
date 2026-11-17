import type { AqiCategory } from "@/lib/aqi/cpcb";

/** Shared Tailwind class strings, so every control looks and behaves alike. */
export const inputClass =
  "w-full min-h-11 rounded-lg border border-slate-400 bg-white px-3 py-2 text-base text-slate-900 " +
  "dark:border-slate-500 dark:bg-slate-900 dark:text-slate-50";

export const primaryButtonClass =
  "min-h-11 rounded-lg bg-teal-800 px-5 py-2 text-base font-semibold text-white " +
  "hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "min-h-11 rounded-lg border border-slate-500 bg-transparent px-4 py-2 text-base font-medium " +
  "hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800";

export const cardClass =
  "rounded-2xl border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900";

/** Badge colours per CPCB category; all pairs meet WCAG AA text contrast. */
export const CATEGORY_BADGE: Readonly<Record<AqiCategory, string>> = {
  good: "bg-emerald-700 text-white",
  satisfactory: "bg-lime-700 text-white",
  moderate: "bg-yellow-400 text-slate-900",
  poor: "bg-orange-700 text-white",
  veryPoor: "bg-red-700 text-white",
  severe: "bg-purple-900 text-white",
};

export const CATEGORY_BAR: Readonly<Record<AqiCategory, string>> = {
  good: "#047857",
  satisfactory: "#4d7c0f",
  moderate: "#ca8a04",
  poor: "#c2410c",
  veryPoor: "#b91c1c",
  severe: "#6b21a8",
};
