import { NextResponse } from "next/server";
import { ruralUnions } from "@/lib/unions";

export async function GET() {
  const unions = ruralUnions();
  const upazilas = [...new Set(unions.map((u) => u.upazila))];
  return NextResponse.json({ upazilas, unions });
}
