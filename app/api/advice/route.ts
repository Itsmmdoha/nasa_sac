import { NextResponse } from "next/server";
import { getAdvice } from "@/lib/llm";
import { buildLlmPayload } from "@/lib/prompt";
import { getClimateSummary } from "@/lib/power";
import { scoreRotations } from "@/lib/scoring";
import { getUnionSoilProfile } from "@/lib/soil";
import { enrichClimateWithSatellite, getSatelliteSummary } from "@/lib/satellite";
import { farmerInputSchema } from "@/lib/types";
import { getUnion } from "@/lib/unions";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = farmerInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const farmer = parsed.data;
  const u = getUnion(farmer.upazila, farmer.union);
  if (!u) {
    return NextResponse.json({ error: "unknown union" }, { status: 404 });
  }

  const soil = getUnionSoilProfile(farmer.upazila, farmer.union);
  let climate = await getClimateSummary(u.lat, u.lon);
  const satellite = getSatelliteSummary(u.lat, u.lon);
  climate = enrichClimateWithSatellite(climate, satellite);

  const scored = scoreRotations({ farmer, soil, climate });
  const location = {
    upazila: farmer.upazila,
    union: farmer.union,
    lat: u.lat,
    lon: u.lon,
  };
  const payload = buildLlmPayload(location, soil, climate, farmer, scored.candidates);
  const { advice, source, fallback_reason } = await getAdvice(
    payload,
    scored.candidates,
    { upazila: farmer.upazila, union: farmer.union },
    soil
  );

  return NextResponse.json({
    advice,
    meta: {
      source,
      fallback_reason,
      baseline_irrigation_mm: scored.baseline_irrigation_mm,
      current_rotation_id: scored.current_rotation_id,
      candidates_sent: scored.candidates.length,
    },
    context: {
      soil,
      climate,
      satellite,
      location,
    },
  });
}
