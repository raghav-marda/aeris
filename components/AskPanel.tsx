"use client";

import { useState, type FormEvent } from "react";
import type { Answer } from "@/lib/ai/ask";
import { requestAnswer } from "@/lib/client/api";
import type { AirData } from "@/lib/client/types";
import type { Profile } from "@/lib/exposure/profile";
import type { Language, Messages } from "@/lib/i18n";
import { cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from "./styles";

const MAX_QUESTION_LENGTH = 300;
const MIN_QUESTION_LENGTH = 3;

interface Props {
  readonly messages: Messages["ask"];
  readonly language: Language;
  readonly profile: Profile;
  readonly air: AirData;
}

type AskState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | ({ readonly status: "done" } & Answer);

/** Grounded Q&A about the user's own plan. */
export default function AskPanel({ messages, language, profile, air }: Props) {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<AskState>({ status: "idle" });

  const ask = async (text: string) => {
    if (text.trim().length < MIN_QUESTION_LENGTH) return;
    setState({ status: "loading" });
    try {
      setState({ status: "done", ...(await requestAnswer(profile, air, language, text.trim())) });
    } catch {
      setState({ status: "error" });
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(question);
  };

  const pick = (suggestion: string) => {
    setQuestion(suggestion);
    void ask(suggestion);
  };

  return (
    <section aria-labelledby="ask-heading" className={`${cardClass} flex flex-col gap-4`}>
      <h2 id="ask-heading" className="text-xl font-bold">
        {messages.heading}
      </h2>
      <ul className="flex flex-wrap gap-2" aria-label={messages.heading}>
        {messages.suggestions.map((suggestion) => (
          <li key={suggestion}>
            <button type="button" className={secondaryButtonClass} onClick={() => pick(suggestion)}>
              {suggestion}
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <label htmlFor="question" className="text-sm font-medium">
          {messages.label}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="question"
            type="text"
            value={question}
            maxLength={MAX_QUESTION_LENGTH}
            placeholder={messages.placeholder}
            onChange={(event) => setQuestion(event.target.value)}
            className={`${inputClass} flex-1 basis-64`}
          />
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={state.status === "loading"}
          >
            {state.status === "loading" ? messages.submitBusy : messages.submit}
          </button>
        </div>
      </form>

      <div role="status" aria-live="polite" className="min-h-6">
        {state.status === "done" && <p className="text-base">{state.answer}</p>}
        {state.status === "error" && (
          <p className="font-medium text-red-700 dark:text-red-300">{messages.error}</p>
        )}
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">{messages.note}</p>
    </section>
  );
}
