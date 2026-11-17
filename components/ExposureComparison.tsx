import type { PersonaSummary } from "@/lib/exposure/planner";
import type { Messages } from "@/lib/i18n";

interface Props {
  readonly personas: readonly PersonaSummary[];
  readonly messages: Messages["plan"];
}

function Bar({
  label,
  ugM3,
  cigarettes,
  widthPercent,
  tone,
  messages,
}: {
  readonly label: string;
  readonly ugM3: number;
  readonly cigarettes: number;
  readonly widthPercent: number;
  readonly tone: string;
  readonly messages: Messages["plan"];
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">
        {label}: {messages.average(String(ugM3))}, {messages.cigarettes(String(cigarettes))}
      </p>
      <div aria-hidden="true" className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-3 rounded-full ${tone}`} style={{ width: `${widthPercent}%` }} />
      </div>
    </div>
  );
}

/** Before/after exposure per household member, scaled to the highest value. */
export default function ExposureComparison({ personas, messages }: Props) {
  const scale = Math.max(...personas.map((p) => p.baselineUgM3), 1);
  const percent = (value: number) => Math.max(2, (value / scale) * 100);

  return (
    <div className="flex flex-col gap-5">
      {personas.map((persona) => (
        <div key={persona.id} className="flex flex-col gap-2">
          <h4 className="text-base font-bold">{messages.personas[persona.id]}</h4>
          <Bar
            label={messages.before}
            ugM3={persona.baselineUgM3}
            cigarettes={persona.baselineCigarettes}
            widthPercent={percent(persona.baselineUgM3)}
            tone="bg-red-700"
            messages={messages}
          />
          <Bar
            label={messages.after}
            ugM3={persona.afterUgM3}
            cigarettes={persona.afterCigarettes}
            widthPercent={percent(persona.afterUgM3)}
            tone="bg-emerald-700"
            messages={messages}
          />
        </div>
      ))}
    </div>
  );
}
