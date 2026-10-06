import { NextRequest, NextResponse } from "next/server";
import { getClimateSummary } from "@/lib/power";
import { enrichClimateWithSatellite, getSatelliteSummary } from "@/lib/satellite";

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: "lat and lon required" }, { status: 400 });
  }
  const climate = await getClimateSummary(lat, lon);
  const sat = getSatelliteSummary(lat, lon);
  return NextResponse.json({
    climate: enrichClimateWithSatellite(climate, sat),
    satellite: sat,
  });
}
