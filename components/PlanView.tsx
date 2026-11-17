"use client";

import { useEffect, useRef } from "react";
import type { PlanState } from "@/lib/client/types";
import type { Messages } from "@/lib/i18n";
import ActionList from "./ActionList";
import ExposureComparison from "./ExposureComparison";
import { cardClass } from "./styles";

interface Props {
  readonly state: PlanState;
  readonly messages: Messages["plan"];
}

/** Renders the plan result. Focus moves to its heading when a new plan arrives. */
export default function PlanView({ state, messages }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ready = state.status === "ready";

  useEffect(() => {
    if (ready) headingRef.current?.focus();
  }, [ready]);

  if (state.status === "idle") return null;
  if (state.status === "loading") {
    return (
      <p role="status" aria-live="polite" className={cardClass}>
        …
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className={`${cardClass} font-medium text-red-700 dark:text-red-300`}>
        {messages.error}
      </p>
    );
  }

  const { plan, narration } = state;
  const badge = narration.source === "ai" ? messages.aiBadge : messages.fallbackBadge;

  return (
    <section aria-labelledby="plan-heading" className={`${cardClass} flex flex-col gap-6`}>
      <div className="flex flex-col gap-2">
        <h2 id="plan-heading" ref={headingRef} tabIndex={-1} className="text-xl font-bold">
          {messages.heading}
        </h2>
        <p className="w-fit rounded-full bg-slate-200 px-3 py-0.5 text-xs font-semibold dark:bg-slate-700">
          {badge}
        </p>
        <p className="text-lg font-semibold">{narration.headline}</p>
        <p>{narration.summary}</p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-bold">{messages.exposureHeading}</h3>
        <ExposureComparison personas={plan.personas} messages={messages} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-bold">{messages.actionsHeading}</h3>
        <ActionList actions={plan.actions} notes={narration.actionNotes} messages={messages} />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-bold">{messages.habitsHeading}</h3>
        <p className="text-sm">{messages.habitsNote}</p>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          {plan.habits.map((id) => (
            <li key={id}>
              <span className="font-semibold">{messages.habits[id].title}.</span>{" "}
              {messages.habits[id].reason}
            </li>
          ))}
        </ul>
      </div>

      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-lg font-bold">
          {messages.assumptionsHeading}
        </summary>
        <ul className="flex list-disc flex-col gap-2 pl-6 text-sm">
          {messages.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </details>

      <p className="text-sm font-medium">{messages.disclaimer}</p>
    </section>
  );
}
