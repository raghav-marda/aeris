"use client";

import { useState } from "react";
import { mergeIntake } from "@/lib/ai/intake";
import { requestIntake } from "@/lib/client/api";
import type { Profile } from "@/lib/exposure/profile";
import type { Messages } from "@/lib/i18n";
import { inputClass, secondaryButtonClass } from "./styles";

const MAX_LENGTH = 500;

interface Props {
  readonly messages: Messages["profile"];
  readonly profile: Profile;
  readonly onProfile: (profile: Profile) => void;
}

/** Free-text description that Gemini turns into form fields. */
export default function IntakeBox({ messages, profile, onProfile }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const fill = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const { intake } = await requestIntake(text);
      onProfile(mergeIntake(profile, intake));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="describe" className="text-sm font-medium">
        {messages.describeLabel}
      </label>
      <textarea
        id="describe"
        rows={3}
        maxLength={MAX_LENGTH}
        value={text}
        placeholder={messages.describePlaceholder}
        onChange={(event) => setText(event.target.value)}
        className={inputClass}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void fill()}
          disabled={busy || text.trim().length < 3}
          className={secondaryButtonClass}
        >
          {busy ? messages.describeBusy : messages.describeButton}
        </button>
        <p className="text-xs text-slate-600 dark:text-slate-300">{messages.describeNote}</p>
      </div>
      <p role="status" aria-live="polite" className="text-sm text-red-700 dark:text-red-300">
        {failed && messages.describeFailed}
      </p>
    </div>
  );
}
