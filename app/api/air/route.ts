import { NextResponse } from "next/server";
import { AirQuerySchema } from "@/lib/api/schemas";
import { jsonError } from "@/lib/api/handler";
import { categorizePm25, pm25ToAqi } from "@/lib/aqi/cpcb";
import { fetchAirSnapshot, geocodeCity, type Place } from "@/lib/air/openMeteo";
import { UpstreamError } from "@/lib/http";
import { logError } from "@/lib/log";
import { clientKeyFrom, isRateLimited } from "@/lib/rateLimit";

const CURRENT_LOCATION_NAME = "Your location";

async function resolvePlace(query: ReturnType<typeof AirQuerySchema.parse>): Promise<Place> {
  if ("city" in query) return geocodeCity(query.city);
  return {
    name: CURRENT_LOCATION_NAME,
    region: null,
    country: null,
    latitude: query.lat,
    longitude: query.lon,
  };
}

export async function GET(req: Request) {
  if (isRateLimited(`air:${clientKeyFrom(req)}`)) {
    return jsonError("Too many requests. Please wait a minute and try again.", 429);
  }

  const params = Object.fromEntries(new URL(req.url).searchParams);
  const query = AirQuerySchema.safeParse(params);
  if (!query.success) return jsonError("Invalid request.", 400);

  try {
    const snapshot = await fetchAirSnapshot(await resolvePlace(query.data));
    return NextResponse.json({
      ...snapshot,
      aqi: pm25ToAqi(snapshot.pm25),
      category: categorizePm25(snapshot.pm25),
    });
  } catch (error) {
    const notFound = error instanceof UpstreamError && error.status === 404;
    logError("air failed", error);
    return jsonError(
      notFound ? "No matching place was found." : "Air data is unavailable.",
      notFound ? 404 : 502
    );
  }
}
