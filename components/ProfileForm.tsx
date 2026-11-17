"use client";

import type { FormEvent } from "react";
import { COMMUTE_MODES, type Profile } from "@/lib/exposure/profile";
import type { Messages } from "@/lib/i18n";
import { CheckboxField, Fieldset, NumberField, RadioOption, SelectField } from "./fields";
import IntakeBox from "./IntakeBox";
import { cardClass, primaryButtonClass } from "./styles";

const MAX_MEMBERS = 10;
const MAX_MINUTES = 600;

interface Props {
  readonly messages: Messages["profile"];
  readonly profile: Profile;
  readonly busy: boolean;
  readonly onChange: (profile: Profile) => void;
  readonly onSubmit: () => void;
}

export default function ProfileForm({ messages, profile, busy, onChange, onSubmit }: Props) {
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    onChange({ ...profile, [key]: value });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const commuteOptions = COMMUTE_MODES.map((mode) => ({
    value: mode,
    label: messages.commuteModes[mode],
  }));
  const hasHousehold = profile.adults + profile.children + profile.seniors > 0;

  return (
    <section aria-labelledby="profile-heading" className={`${cardClass} flex flex-col gap-4`}>
      <h2 id="profile-heading" className="text-xl font-bold">
        {messages.heading}
      </h2>
      <IntakeBox messages={messages} profile={profile} onProfile={onChange} />

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label={messages.adults}
            value={profile.adults}
            min={0}
            max={MAX_MEMBERS}
            onChange={(v) => set("adults", v)}
          />
          <NumberField
            label={messages.children}
            value={profile.children}
            min={0}
            max={MAX_MEMBERS}
            onChange={(v) => set("children", v)}
          />
          <NumberField
            label={messages.seniors}
            value={profile.seniors}
            min={0}
            max={MAX_MEMBERS}
            onChange={(v) => set("seniors", v)}
          />
        </div>
        <CheckboxField
          label={messages.sensitiveMember}
          checked={profile.sensitiveMember}
          onChange={(v) => set("sensitiveMember", v)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label={messages.commuteMode}
            value={profile.commuteMode}
            options={commuteOptions}
            onChange={(v) => set("commuteMode", v)}
          />
          <NumberField
            label={messages.commuteMinutes}
            value={profile.commuteMinutes}
            min={0}
            max={MAX_MINUTES}
            onChange={(v) => set("commuteMinutes", v)}
          />
        </div>
        <CheckboxField
          label={messages.transitAvailable}
          checked={profile.transitAvailable}
          onChange={(v) => set("transitAvailable", v)}
        />
        <NumberField
          label={messages.childOutdoorMinutes}
          value={profile.childOutdoorMinutes}
          min={0}
          max={MAX_MINUTES}
          onChange={(v) => set("childOutdoorMinutes", v)}
        />

        <Fieldset legend={messages.windows}>
          <RadioOption
            name="windows"
            label={messages.windowOpen}
            checked={profile.windows === "open"}
            onSelect={() => set("windows", "open")}
          />
          <RadioOption
            name="windows"
            label={messages.windowClosed}
            checked={profile.windows === "closed"}
            onSelect={() => set("windows", "closed")}
          />
        </Fieldset>
        <CheckboxField
          label={messages.hasPurifier}
          checked={profile.hasPurifier}
          onChange={(v) => set("hasPurifier", v)}
        />

        <button
          type="submit"
          className={`${primaryButtonClass} w-fit`}
          disabled={busy || !hasHousehold}
        >
          {busy ? messages.submitBusy : messages.submit}
        </button>
      </form>
    </section>
  );
}
