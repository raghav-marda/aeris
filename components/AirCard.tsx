import { cigarettesPerDay } from "@/lib/aqi/cigarettes";
import { dayMeanPm25 } from "@/lib/exposure/engine";
import type { Messages } from "@/lib/i18n";
import type { AirData } from "@/lib/client/types";
import HourlyChart from "./HourlyChart";
import { CATEGORY_BADGE, cardClass } from "./styles";

interface Props {
  readonly air: AirData;
  readonly messages: Messages["air"];
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-sm text-slate-600 dark:text-slate-300">{label}</dt>
      <dd className="text-2xl font-bold">{value}</dd>
    </div>
  );
}

export default function AirCard({ air, messages }: Props) {
  const category = messages.categories[air.category];
  const mean = dayMeanPm25(air);

  return (
    <section aria-labelledby="air-heading" className={`${cardClass} flex flex-col gap-4`}>
      <h2 id="air-heading" className="text-xl font-bold">
        {messages.heading}
      </h2>
      {air.place && <p className="text-sm">{messages.place(air.place.name)}</p>}

      <p
        className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-1 text-lg font-bold ${CATEGORY_BADGE[air.category]}`}
      >
        <span>{category.label}</span>
        <span aria-hidden="true">·</span>
        <span>
          {messages.aqiLabel} {air.aqi}
        </span>
      </p>
      <p>{category.advice}</p>

      <dl className="grid grid-cols-2 gap-4">
        <Stat label={messages.pm25Now} value={`${Math.round(air.pm25)} µg/m³`} />
        <Stat label={messages.pm25Mean} value={`${Math.round(mean)} µg/m³`} />
      </dl>
      <p>{messages.cigarettes(String(cigarettesPerDay(mean)))}</p>

      <HourlyChart hourly={air.hourly} messages={messages} />
      <p className="text-xs text-slate-600 dark:text-slate-300">
        {air.source === "manual" ? messages.manualSource : messages.modelSource}
      </p>
    </section>
  );
}
