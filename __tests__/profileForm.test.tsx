// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProfileForm from "../components/ProfileForm";
import { DEFAULT_PROFILE, type Profile } from "../lib/exposure/profile";
import { getMessages } from "../lib/i18n";

const messages = getMessages("en").profile;

/** Holds the profile in state the way the app does, and exposes the latest value. */
function Harness({
  onLatest,
  onSubmit,
  initial = DEFAULT_PROFILE,
}: {
  onLatest: (profile: Profile) => void;
  onSubmit: () => void;
  initial?: Profile;
}) {
  const [profile, setProfile] = useState(initial);
  return (
    <ProfileForm
      messages={messages}
      profile={profile}
      busy={false}
      onChange={(next) => {
        setProfile(next);
        onLatest(next);
      }}
      onSubmit={onSubmit}
    />
  );
}

afterEach(cleanup);

describe("ProfileForm", () => {
  it("writes every household and home field back into the profile", async () => {
    const user = userEvent.setup();
    const latest = vi.fn();
    render(<Harness onLatest={latest} onSubmit={vi.fn()} />);

    await user.clear(screen.getByLabelText(messages.seniors));
    await user.type(screen.getByLabelText(messages.seniors), "2");
    await user.click(screen.getByLabelText(messages.sensitiveMember));
    await user.click(screen.getByLabelText(messages.transitAvailable));
    await user.click(screen.getByLabelText(messages.hasPurifier));
    await user.click(screen.getByLabelText(messages.windowClosed));
    await user.click(screen.getByLabelText(messages.windowOpen));
    await user.clear(screen.getByLabelText(messages.childOutdoorMinutes));
    await user.type(screen.getByLabelText(messages.childOutdoorMinutes), "45");
    await user.selectOptions(screen.getByLabelText(messages.commuteMode), "walk");

    const profile = latest.mock.lastCall?.[0] as Profile;
    expect(profile.seniors).toBe(2);
    expect(profile.sensitiveMember).toBe(!DEFAULT_PROFILE.sensitiveMember);
    expect(profile.transitAvailable).toBe(!DEFAULT_PROFILE.transitAvailable);
    expect(profile.hasPurifier).toBe(!DEFAULT_PROFILE.hasPurifier);
    expect(profile.windows).toBe("open");
    expect(profile.childOutdoorMinutes).toBe(45);
    expect(profile.commuteMode).toBe("walk");
  });

  it("submits without reloading the page", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onLatest={vi.fn()} onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: messages.submit }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("blocks submission when nobody lives in the household", () => {
    render(
      <Harness
        onLatest={vi.fn()}
        onSubmit={vi.fn()}
        initial={{ ...DEFAULT_PROFILE, adults: 0, children: 0, seniors: 0 }}
      />
    );
    expect(
      (screen.getByRole("button", { name: messages.submit }) as HTMLButtonElement).disabled
    ).toBe(true);
  });
});
