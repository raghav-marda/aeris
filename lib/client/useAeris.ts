"use client";

import { useCallback, useState } from "react";
import { DEFAULT_PROFILE, type Profile } from "../exposure/profile";
import type { Language } from "../i18n";
import { useLocalStorageState } from "../useLocalStorageState";
import { requestPlan } from "./api";
import type { AirData, PlanState } from "./types";

const LANGUAGE_KEY = "aeris.language";

/** Owns the app's state and the one action that talks to the plan API. */
export function useAeris() {
  const [language, setStoredLanguage] = useLocalStorageState<Language>(LANGUAGE_KEY, "en");
  const [air, setAir] = useState<AirData | null>(null);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [planState, setPlanState] = useState<PlanState>({ status: "idle" });

  const buildPlan = useCallback(
    async (nextAir: AirData, nextProfile: Profile, nextLanguage: Language) => {
      setPlanState({ status: "loading" });
      try {
        const result = await requestPlan(nextProfile, nextAir, nextLanguage);
        setPlanState({ status: "ready", ...result });
      } catch {
        setPlanState({ status: "error" });
      }
    },
    []
  );

  const submitProfile = useCallback(async () => {
    if (air) await buildPlan(air, profile, language);
  }, [air, profile, language, buildPlan]);

  /** Switches language and, if a plan exists, regenerates its explanation. */
  const changeLanguage = useCallback(
    (next: Language) => {
      setStoredLanguage(next);
      if (air && planState.status === "ready") void buildPlan(air, profile, next);
    },
    [air, planState.status, profile, buildPlan, setStoredLanguage]
  );

  const updateAir = useCallback((next: AirData) => {
    setAir(next);
    setPlanState({ status: "idle" });
  }, []);

  return {
    language,
    air,
    profile,
    planState,
    setProfile,
    updateAir,
    submitProfile,
    changeLanguage,
  };
}
