import type { ClimateSummary, FarmerInput, ScoredCandidate, UnionSoilProfile } from "./types";

export const SYSTEM_PROMPT = `You explain one crop rotation that has already been chosen for a smallholder farmer in the Barind tract, Bangladesh.
The rotation is final. Do not choose a different crop or change any number.
Write short, plain sentences a farmer or extension officer can read aloud.
If zone_note or market_note is non-empty, say that fact in the summary.
Return JSON with summary, reasons (2 to 4), risks, soil_direction (improves, neutral, or degrades), soil_explanation, water_note, and uncertainty_note.
Also return "bn": the same summary, reasons, risks, soil_explanation, water_note, and uncertainty_note in plain, natural Bangla (Bengali script, Bangla digits) for a Rajshahi farmer.`;

export function buildExplainPayload(input: {
  location: { upazila: string; union: string };
  soil: UnionSoilProfile;
  climate: ClimateSummary;
  farmer: FarmerInput;
  rotation: ScoredCandidate;
  zoneNote: string;
  marketNote: string;
}) {
  const { location, soil, climate, farmer, rotation, zoneNote, marketNote } = input;
  return {
    location,
    soil: {
      ph_median: soil.ph_median,
      om_pct: soil.om_pct,
      texture: soil.texture,
      drainage: soil.drainage,
    },
    climate: {
      rabi_rain_normal_mm: climate.rabi_rain_normal_mm,
      smap_rootzone_rabi_m3m3: climate.smap_rootzone_rabi_m3m3,
    },
    farmer: {
      farm_name: farmer.farm_name,
      last_crops: farmer.last_crops,
      budget: farmer.budget,
      water: farmer.water,
      priorities: farmer.priorities,
    },
    rotation: {
      rotation_id: rotation.rotation_id,
      name: rotation.name,
      seasons: rotation.seasons,
      scores: rotation.scores,
      irrigation_mm: rotation.irrigation_mm,
      change_vs_current_pct: rotation.change_vs_current_pct,
    },
    zone_note: zoneNote,
    market_note: marketNote,
  };
}
