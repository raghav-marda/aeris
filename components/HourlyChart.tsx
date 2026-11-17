import { categorizePm25 } from "@/lib/aqi/cpcb";
import type { HourlyPm25 } from "@/lib/exposure/profile";
import { formatHour, type Messages } from "@/lib/i18n";
import { CATEGORY_BAR } from "./styles";

const WIDTH = 480;
const HEIGHT = 120;
const LABEL_EVERY_HOURS = 6;

interface Props {
  readonly hourly: readonly HourlyPm25[];
  readonly messages: Messages["air"];
}

/** Bar chart of the next 24 hours, with an equivalent table for screen readers. */
export default function HourlyChart({ hourly, messages }: Props) {
  if (hourly.length === 0) return null;

  const peak = Math.max(...hourly.map((h) => h.pm25), 1);
  const barWidth = WIDTH / hourly.length;
  const summary = `${messages.chartTitle}: ${hourly
    .filter((_, index) => index % LABEL_EVERY_HOURS === 0)
    .map((h) => `${formatHour(h.hour)} ${Math.round(h.pm25)}`)
    .join(", ")}`;

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-medium">{messages.chartTitle}</figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT + 18}`}
        role="img"
        aria-label={summary}
        className="w-full"
      >
        {hourly.map((point, index) => {
          const height = Math.max(2, (point.pm25 / peak) * HEIGHT);
          return (
            <rect
              key={`${point.hour}-${index}`}
              x={index * barWidth + 1}
              y={HEIGHT - height}
              width={barWidth - 2}
              height={height}
              fill={CATEGORY_BAR[categorizePm25(point.pm25)]}
            />
          );
        })}
        {hourly.map((point, index) =>
          index % LABEL_EVERY_HOURS === 0 ? (
            <text
              key={`label-${point.hour}-${index}`}
              x={index * barWidth}
              y={HEIGHT + 14}
              fontSize="11"
              fill="currentColor"
            >
              {formatHour(point.hour)}
            </text>
          ) : null
        )}
      </svg>
      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm underline">
          {messages.chartTableCaption}
        </summary>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{messages.chartTableCaption}</caption>
          <thead>
            <tr>
              <th scope="col" className="py-1 pr-4">
                {messages.hourColumn}
              </th>
              <th scope="col" className="py-1">
                {messages.pm25Column}
              </th>
            </tr>
          </thead>
          <tbody>
            {hourly.map((point, index) => (
              <tr key={`row-${point.hour}-${index}`}>
                <td className="py-1 pr-4">{formatHour(point.hour)}</td>
                <td className="py-1">{Math.round(point.pm25)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
