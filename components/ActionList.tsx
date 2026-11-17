import type { ActionId } from "@/lib/exposure/actions";
import type { PlannedAction } from "@/lib/exposure/planner";
import { formatHour, type Messages } from "@/lib/i18n";

/** Below this, a saving is described as "under 0.1" instead of a rounded zero. */
const MIN_SHOWN_CIGARETTES = 0.1;

interface Props {
  readonly actions: readonly PlannedAction[];
  readonly notes: Readonly<Partial<Record<ActionId, string>>>;
  readonly messages: Messages["plan"];
}

export default function ActionList({ actions, notes, messages }: Props) {
  return (
    <ol className="flex flex-col gap-4">
      {actions.map((action) => {
        const advice = messages.actions[action.id];
        return (
          <li
            key={action.id}
            className="flex gap-4 rounded-xl border border-slate-300 p-4 dark:border-slate-700"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-800 font-bold text-white"
            >
              {action.rank}
            </span>
            <div className="flex flex-col gap-1">
              <h4 className="text-lg font-bold">{advice.title}</h4>
              <p className="w-fit rounded-full border border-slate-500 px-3 py-0.5 text-xs font-semibold">
                {messages.effort[action.effort]}
              </p>
              <p className="font-medium">
                {messages.impact(
                  messages.personasPossessive[action.personaId],
                  String(action.savingUgM3),
                  action.savingCigarettes < MIN_SHOWN_CIGARETTES
                    ? messages.underTenth
                    : String(action.savingCigarettes)
                )}
              </p>
              {action.window && (
                <p className="text-sm">
                  {messages.window(
                    formatHour(action.window.startHour),
                    formatHour(action.window.endHour),
                    String(action.window.meanPm25)
                  )}
                </p>
              )}
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {notes[action.id] ?? advice.reason}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
