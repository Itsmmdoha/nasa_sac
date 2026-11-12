import { NextResponse } from "next/server";
import { confidenceLevel, type Explanation } from "@/lib/advice";
import { farmId, isDbDown, persistDecision } from "@/lib/db";
import { jevDecision } from "@/lib/jev";
import { explainAssignment } from "@/lib/llm";
import { loadHeadlines, type MarketSignal } from "@/lib/market";
import { buildExplainPayload } from "@/lib/prompt";
import { getClimateSummary } from "@/lib/power";
import { scoreRotations } from "@/lib/scoring";
import { getUnionSoilProfile } from "@/lib/soil";
import { enrichClimateWithSatellite, getSatelliteSummary } from "@/lib/satellite";
import { farmerInputSchema, type ScoredCandidate } from "@/lib/types";
import { getUnion } from "@/lib/unions";
import { previousSeasonKey, seasonKey } from "@/lib/upcomingSeason";
import type { CropOption } from "@/lib/zone";

function optionsOf(allowed: ScoredCandidate[]): CropOption[] {
  return allowed.map((c) => ({
    rotation_id: c.rotation_id,
    rabi_crop: c.seasons.rabi.crop,
    overall: c.scores.overall,
  }));
}

function marketNote(market: MarketSignal[], decisionSource: string): string {
  if (decisionSource !== "jev") return "Market check unavailable.";
  const glut = market.filter((m) => m.glut).map((m) => m.crop);
  if (!glut.length) return "No headline cleared the glut bar.";
  return `Market headlines show an early glut for ${glut.join(", ")}.`;
}

function zoneNote(input: {
  deferred: boolean;
  displaced: boolean;
  bestName: string;
  assignedName: string;
}): string {
  if (input.deferred) {
    return `Your field's best fit was ${input.bestName}. The zone plan assigns ${input.assignedName} so the zone does not flood one market. You are first for the top crop next season.`;
  }
  if (input.displaced) {
    return `${input.assignedName} fits this field better than another farm in the zone, so the weaker match moves to a different suitable crop.`;
  }
  return "";
}

function cardRotation(candidate: ScoredCandidate, explanation: Explanation, unsure: boolean, confidence: number | null) {
  const level = confidenceLevel(unsure, confidence);
  const pct = confidence == null ? "" : ` Decision confidence ${Math.round(confidence * 100)}%.`;
  return {
    rank: 0,
    rotation_id: candidate.rotation_id,
    name: candidate.name,
    seasons: candidate.seasons,
    scores: candidate.scores,
    water_use: {
      irrigation_mm: candidate.irrigation_mm,
      change_vs_current_pct: candidate.change_vs_current_pct,
      note: explanation.water_note,
    },
    soil_health_effect: {
      direction: explanation.soil_direction,
      explanation: explanation.soil_explanation,
    },
    reasons: explanation.reasons,
    risks: explanation.risks,
    confidence: {
      level,
      uncertainty_note: `${explanation.uncertainty_note}${pct}`.trim(),
    },
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = farmerInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const farmer = parsed.data;
  const u = getUnion(farmer.upazila, farmer.union);
  if (!u) return NextResponse.json({ error: "unknown union" }, { status: 404 });

  const soil = getUnionSoilProfile(farmer.upazila, farmer.union);
  let climate = await getClimateSummary(u.lat, u.lon);
  const satellite = getSatelliteSummary(u.lat, u.lon);
  climate = enrichClimateWithSatellite(climate, satellite);

  const scored = scoreRotations({ farmer, soil, climate });
  if (!scored.allowed.length) {
    return NextResponse.json({ error: "no rotations to score" }, { status: 500 });
  }

  const decision = await jevDecision({
    allowed: scored.allowed,
    headlines: loadHeadlines(),
    upazila: farmer.upazila,
    union: farmer.union,
    water: farmer.water,
    budget: farmer.budget,
    lastRabi: farmer.last_crops.rabi,
    ph: soil.ph_median,
    rabiRainMm: climate.rabi_rain_normal_mm,
  });
  const market = decision.market;
  const best =
    scored.allowed.find((c) => c.rotation_id === decision.rotation_id) ?? scored.allowed[0]!;
  const season = seasonKey();
  const noteMarket = marketNote(market, decision.source);

  let saved;
  try {
    saved = await persistDecision({
      farmName: farmer.farm_name,
      upazila: farmer.upazila,
      unionName: farmer.union,
      season,
      previousSeason: previousSeasonKey(season),
      individualBestRotationId: best.rotation_id,
      options: optionsOf(scored.allowed),
      confidence: decision.confidence,
      unsure: decision.unsure,
      glutCrops: market.filter((m) => m.glut).map((m) => m.crop),
    });
  } catch (e) {
    if (isDbDown(e)) {
      return NextResponse.json(
        { error: "Database is not running. Start it with docker compose up -d" },
        { status: 503 }
      );
    }
    throw e;
  }

  const assigned =
    scored.allowed.find((c) => c.rotation_id === saved.result.rotation_id) ?? best;
  const noteZone = zoneNote({
    deferred: saved.result.deferred,
    displaced: Boolean(saved.result.displaced),
    bestName: best.name,
    assignedName: assigned.name,
  });
  const payload = buildExplainPayload({
    location: { upazila: farmer.upazila, union: farmer.union },
    soil,
    climate,
    farmer,
    rotation: assigned,
    zoneNote: noteZone,
    marketNote: noteMarket,
  });
  const explained = await explainAssignment({
    payload,
    candidate: assigned,
    soil,
    zoneNote: noteZone,
    marketNote: noteMarket,
  });

  return NextResponse.json({
    advice: {
      summary: explained.explanation.summary,
      location: { upazila: farmer.upazila, union: farmer.union },
      farm_name: farmer.farm_name,
      rotation: cardRotation(assigned, explained.explanation, decision.unsure, decision.confidence),
      unsure: decision.unsure,
      confidence: decision.confidence,
      decision_source: decision.source,
      deferred: saved.result.deferred,
      priority: saved.priority,
      individual_best_name: best.name,
      individual_best_rotation_id: best.rotation_id,
      zone_note: noteZone,
      zone: { upazila: farmer.upazila, season, counts: saved.counts },
      market,
      market_note: noteMarket,
    },
    meta: {
      source: explained.source,
      decision_source: decision.source,
      fallback_reason: explained.fallback_reason ?? decision.fallback_reason,
      decision_fallback: decision.fallback_reason,
      farm_id: farmId(farmer.upazila, farmer.farm_name),
      baseline_irrigation_mm: scored.baseline_irrigation_mm,
      current_rotation_id: scored.current_rotation_id,
    },
    context: {
      soil,
      climate,
      satellite,
      location: { upazila: farmer.upazila, union: farmer.union, lat: u.lat, lon: u.lon },
    },
  });
}
