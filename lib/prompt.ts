import type { ClimateSummary, FarmerInput, ScoredCandidate, UnionSoilProfile } from "./types";

export const SYSTEM_PROMPT = `You are an agronomy assistant for smallholder farmers in the Barind tract, Bangladesh.
You receive: a union's SRDI soil profile, NASA climate and soil-moisture summaries,
the farmer's situation and priorities, and up to 5 candidate rotations already scored by code.

Rules:
- Only recommend rotations from the candidate list. Use their rotation_id exactly.
- Copy the numeric scores, irrigation_mm and change_vs_current_pct from the input. Never invent numbers.
- You may reorder the top candidates only if the farmer's stated priorities clearly justify it; say why.
- Reasons must cite the input (e.g. "soil pH 5.8", "31 mm normal Rabi rain", "lentil suitable on 93% of Tanore").
- Mention fertilizer or lime only from the SRDI FRS figures provided.
- Lower your confidence when the data is coarse: POWER is ~50 km, SMAP is 9 km, the soil survey date is unknown.
- Write short, plain sentences a farmer or extension officer can read aloud.
Never change seasons, crop ids, or numeric scores in your output; the server overwrites them from the scorer.
Return JSON matching the schema.`;

export function buildLlmPayload(
  location: { upazila: string; union: string; lat: number; lon: number },
  soil: UnionSoilProfile,
  climate: ClimateSummary,
  farmer: FarmerInput,
  candidates: ScoredCandidate[]
) {
  return {
    location,
    soil: {
      ph_median: soil.ph_median,
      om_pct: soil.om_pct,
      texture: soil.texture,
      land_type: soil.land_type,
      drainage: soil.drainage,
      ph_class_area: soil.ph_class_area,
      frs: soil.frs,
      source: soil.source,
    },
    climate: {
      rabi_rain_normal_mm: climate.rabi_rain_normal_mm,
      kharif1_rain_normal_mm: climate.kharif1_rain_normal_mm,
      kharif2_rain_normal_mm: climate.kharif2_rain_normal_mm,
      hot_days_feb_mar: climate.hot_days_feb_mar,
      hot_days_apr_may: climate.hot_days_apr_may,
      gwetroot_rabi_mean: climate.gwetroot_rabi_mean,
      smap_rootzone_rabi_m3m3: climate.smap_rootzone_rabi_m3m3,
    },
    farmer: {
      last_crops: farmer.last_crops,
      budget: farmer.budget,
      water: farmer.water,
      can_sell: farmer.can_sell,
      priorities: farmer.priorities,
    },
    candidates: candidates.map((c) => ({
      rotation_id: c.rotation_id,
      name: c.name,
      seasons: c.seasons,
      scores: c.scores,
      irrigation_mm: c.irrigation_mm,
      change_vs_current_pct: c.change_vs_current_pct,
    })),
  };
}
