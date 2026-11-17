"use client";

import { useEffect } from "react";
import { getMessages } from "@/lib/i18n";
import { useAeris } from "@/lib/client/useAeris";
import AccessibilityBar from "./AccessibilityBar";
import AirCard from "./AirCard";
import AskPanel from "./AskPanel";
import LocationPanel from "./LocationPanel";
import PlanView from "./PlanView";
import ProfileForm from "./ProfileForm";

/** Page shell: wires the shared state to each section of the flow. */
export default function AerisApp() {
  const {
    language,
    air,
    profile,
    planState,
    setProfile,
    updateAir,
    submitProfile,
    changeLanguage,
  } = useAeris();
  const messages = getMessages(language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-teal-800 focus:px-4 focus:py-2 focus:text-white"
      >
        {messages.app.skip}
      </a>
      <AccessibilityBar
        messages={messages.a11y}
        language={language}
        onLanguageChange={changeLanguage}
      />
      <header className="mx-auto flex max-w-3xl flex-col gap-2 px-4 pb-4 pt-8">
        <p className="text-sm font-bold uppercase tracking-widest text-teal-800 dark:text-teal-300">
          {messages.app.name} · {messages.app.tagline}
        </p>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{messages.hero.title}</h1>
        <p className="text-lg">{messages.hero.subtitle}</p>
      </header>

      <main id="main-content" className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-16">
        <LocationPanel messages={messages.location} onAir={updateAir} />
        {air && <AirCard air={air} messages={messages.air} />}
        {air && (
          <ProfileForm
            messages={messages.profile}
            profile={profile}
            busy={planState.status === "loading"}
            onChange={setProfile}
            onSubmit={() => void submitProfile()}
          />
        )}
        <PlanView state={planState} messages={messages.plan} />
        {air && planState.status === "ready" && (
          <AskPanel messages={messages.ask} language={language} profile={profile} air={air} />
        )}
      </main>
    </>
  );
}
