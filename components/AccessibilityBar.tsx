"use client";

import { useEffect } from "react";
import { LANGUAGES, type Language, type Messages } from "@/lib/i18n";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

const STORAGE_KEY = "aeris.accessibility";

interface A11yState {
  readonly highContrast: boolean;
  readonly largeText: boolean;
}

const DEFAULT_STATE: A11yState = { highContrast: false, largeText: false };

const LANGUAGE_LABELS: Readonly<Record<Language, string>> = { en: "English", hi: "हिन्दी" };

const toggleClass =
  "min-h-11 rounded-full border border-slate-500 px-4 py-1 text-sm font-medium " +
  "hover:bg-slate-200 aria-pressed:bg-teal-800 aria-pressed:text-white dark:hover:bg-slate-800";

interface Props {
  readonly messages: Messages["a11y"];
  readonly language: Language;
  readonly onLanguageChange: (language: Language) => void;
}

/** Language switch plus high-contrast and large-text toggles, remembered per device. */
export default function AccessibilityBar({ messages, language, onLanguageChange }: Props) {
  const [state, setState] = useLocalStorageState<A11yState>(STORAGE_KEY, DEFAULT_STATE);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", state.highContrast);
    document.documentElement.classList.toggle("large-text", state.largeText);
  }, [state]);

  return (
    <div
      role="region"
      aria-label={messages.region}
      className="flex flex-wrap items-center gap-2 border-b border-slate-300 bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-900"
    >
      <div role="group" aria-label={messages.language} className="flex gap-2">
        {LANGUAGES.map((code) => (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={language === code}
            onClick={() => onLanguageChange(code)}
            className={toggleClass}
          >
            {LANGUAGE_LABELS[code]}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={state.highContrast}
        onClick={() => setState((s) => ({ ...s, highContrast: !s.highContrast }))}
        className={toggleClass}
      >
        {messages.highContrast}
      </button>
      <button
        type="button"
        aria-pressed={state.largeText}
        onClick={() => setState((s) => ({ ...s, largeText: !s.largeText }))}
        className={toggleClass}
      >
        {messages.largeText}
      </button>
    </div>
  );
}
