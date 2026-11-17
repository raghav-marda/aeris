import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAirSnapshot, geocodeCity, upcomingHours } from "../lib/air/openMeteo";
import { UpstreamError } from "../lib/http";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe("upcomingHours", () => {
  const hourly = {
    time: ["2026-11-17T00:00", "2026-11-17T01:00", "2026-11-17T02:00", "2026-11-17T03:00"],
    pm2_5: [10, null, 30, 40],
  };

  it("starts at the current hour and skips missing values", () => {
    expect(upcomingHours(hourly, "2026-11-17T01:20")).toEqual([
      { hour: 2, pm25: 30 },
      { hour: 3, pm25: 40 },
    ]);
  });

  it("caps the forecast at 24 hours", () => {
    const long = {
      time: Array.from(
        { length: 48 },
        (_, i) => `2026-11-${17 + Math.floor(i / 24)}T${String(i % 24).padStart(2, "0")}:00`
      ),
      pm2_5: Array.from({ length: 48 }, () => 5),
    };
    expect(upcomingHours(long, "2026-11-17T00:00")).toHaveLength(24);
  });
});

describe("geocodeCity", () => {
  it("returns the best match and caches it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({
        results: [
          {
            name: "Lucknow",
            latitude: 26.84,
            longitude: 80.94,
            admin1: "Uttar Pradesh",
            country: "India",
          },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = await geocodeCity("Lucknow");
    await geocodeCity("  lucknow ");
    expect(first).toMatchObject({ name: "Lucknow", region: "Uttar Pradesh", country: "India" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("raises a 404 when nothing matches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({})));
    await expect(geocodeCity("Nowhereville")).rejects.toMatchObject({ status: 404 });
  });
});

describe("fetchAirSnapshot", () => {
  const place = { name: "Test", region: null, country: null, latitude: 10.123, longitude: 20.456 };
  const payload = {
    current: { time: "2026-11-17T10:15", pm2_5: 120 },
    hourly: {
      time: ["2026-11-17T10:00", "2026-11-17T11:00"],
      pm2_5: [118, 110],
    },
  };

  it("combines the current reading with the forecast and caches by rounded coordinates", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(payload));
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await fetchAirSnapshot(place);
    await fetchAirSnapshot({ ...place, latitude: 10.1234 });

    expect(snapshot.pm25).toBe(120);
    expect(snapshot.hourly).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("timezone=auto");
  });

  it("falls back to the first forecast hour when the current value is missing", async () => {
    const body = { ...payload, current: { time: "2026-11-17T10:15", pm2_5: null } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(body)));
    const snapshot = await fetchAirSnapshot({ ...place, latitude: 11.5, longitude: 21.5 });
    expect(snapshot.pm25).toBe(118);
  });

  it("fails clearly when no data exists", async () => {
    const empty = {
      current: { time: "2026-11-17T10:15", pm2_5: null },
      hourly: { time: [], pm2_5: [] },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(empty)));
    await expect(
      fetchAirSnapshot({ ...place, latitude: 12.5, longitude: 22.5 })
    ).rejects.toBeInstanceOf(UpstreamError);
  });

  it("rejects responses of an unexpected shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ surprise: true })));
    await expect(
      fetchAirSnapshot({ ...place, latitude: 13.5, longitude: 23.5 })
    ).rejects.toBeInstanceOf(UpstreamError);
  });
});
