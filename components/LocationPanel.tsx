"use client";

import { useState, type FormEvent } from "react";
import { fetchAir, manualAir } from "@/lib/client/api";
import type { AirData } from "@/lib/client/types";
import type { Messages } from "@/lib/i18n";
import { cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from "./styles";

type Status = "idle" | "loading" | "error" | "denied";

const COORDINATE_DECIMALS = 2;
const MAX_MANUAL_PM25 = 1000;

interface Props {
  readonly messages: Messages["location"];
  readonly onAir: (air: AirData) => void;
}

/** Lets the user pick a place (search or GPS) or type a PM2.5 reading by hand. */
export default function LocationPanel({ messages, onAir }: Props) {
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [showManual, setShowManual] = useState(false);
  const [manualValue, setManualValue] = useState("");

  const lookup = async (query: Parameters<typeof fetchAir>[0]) => {
    setStatus("loading");
    try {
      onAir(await fetchAir(query));
      setStatus("idle");
    } catch {
      setStatus("error");
      setShowManual(true);
    }
  };

  const searchCity = (event: FormEvent) => {
    event.preventDefault();
    if (city.trim().length >= 2) void lookup({ city: city.trim() });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return setStatus("denied");
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        void lookup({
          lat: Number(coords.latitude.toFixed(COORDINATE_DECIMALS)),
          lon: Number(coords.longitude.toFixed(COORDINATE_DECIMALS)),
        }),
      () => setStatus("denied")
    );
  };

  const applyManual = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(manualValue);
    if (Number.isFinite(value) && value >= 0 && value <= MAX_MANUAL_PM25) {
      onAir(manualAir(value));
      setStatus("idle");
    }
  };

  return (
    <section aria-labelledby="location-heading" className={`${cardClass} flex flex-col gap-4`}>
      <h2 id="location-heading" className="text-xl font-bold">
        {messages.heading}
      </h2>

      <form onSubmit={searchCity} className="flex flex-col gap-2">
        <label htmlFor="city" className="text-sm font-medium">
          {messages.cityLabel}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="city"
            type="text"
            value={city}
            maxLength={80}
            placeholder={messages.cityPlaceholder}
            autoComplete="address-level2"
            onChange={(event) => setCity(event.target.value)}
            className={`${inputClass} flex-1 basis-56`}
          />
          <button type="submit" className={primaryButtonClass} disabled={status === "loading"}>
            {messages.check}
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={useMyLocation}
            disabled={status === "loading"}
          >
            {messages.useMyLocation}
          </button>
        </div>
      </form>

      <p role="status" aria-live="polite" className="min-h-6 text-sm">
        {status === "loading" && messages.loading}
        {status === "denied" && messages.locationDenied}
      </p>
      {status === "error" && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
          {messages.error}
        </p>
      )}

      <div>
        <button
          type="button"
          aria-expanded={showManual}
          onClick={() => setShowManual((open) => !open)}
          className="min-h-11 text-sm underline"
        >
          {messages.manualToggle}
        </button>
        {showManual && (
          <form onSubmit={applyManual} className="mt-2 flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="manual-pm25" className="text-sm font-medium">
                {messages.manualLabel}
              </label>
              <input
                id="manual-pm25"
                type="number"
                inputMode="decimal"
                min={0}
                max={MAX_MANUAL_PM25}
                value={manualValue}
                onChange={(event) => setManualValue(event.target.value)}
                className={`${inputClass} w-40`}
              />
            </div>
            <button type="submit" className={secondaryButtonClass}>
              {messages.manualApply}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
