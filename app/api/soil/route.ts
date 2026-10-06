import { NextRequest, NextResponse } from "next/server";
import { getUnionSoilProfile } from "@/lib/soil";

export async function GET(req: NextRequest) {
  const upazila = req.nextUrl.searchParams.get("upazila");
  const union = req.nextUrl.searchParams.get("union");
  if (!upazila || !union) {
    return NextResponse.json({ error: "upazila and union required" }, { status: 400 });
  }
  const profile = getUnionSoilProfile(upazila, union);
  if (profile.sample_count === 0) {
    return NextResponse.json({ error: "no soil samples for union" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
