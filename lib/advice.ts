import { z } from "zod";
import type { ScoredCandidate } from "./types";

const seasonCrop = z.object({
  crop: z.string(),
  months: z.string().max(300),
});

const rotationSchema = z.object({
  rank: z.number().int(),
  rotation_id: z.string(),
  name: z.string().max(300),
  seasons: z.object({
    rabi: seasonCrop,
    kharif1: seasonCrop,
    kharif2: seasonCrop,
  }),
  scores: z.object({
    overall: z.number().int().min(0).max(100),
    water: z.number().int().min(0).max(100),
    soil_health: z.number().int().min(0).max(100),
    profit: z.number().int().min(0).max(100),
    climate_risk: z.number().int().min(0).max(100),
  }),
  water_use: z.object({
    irrigation_mm: z.number(),
    change_vs_current_pct: z.number(),
    note: z.string().max(300),
  }),
  soil_health_effect: z.object({
    direction: z.enum(["improves", "neutral", "degrades"]),
    explanation: z.string().max(300),
  }),
  reasons: z.array(z.string().max(300)).min(2).max(4),
  risks: z
    .array(
      z.object({
        risk: z.string().max(300),
        mitigation: z.string().max(300),
      })
    )
    .max(3),
  confidence: z.object({
    level: z.enum(["low", "medium", "high"]),
    uncertainty_note: z.string().max(300),
  }),
});

export const rotationAdviceSchema = z.object({
  location: z.object({
    upazila: z.string(),
    union: z.string(),
  }),
  summary: z.string().max(600),
  rotations: z.array(rotationSchema).length(3),
  not_recommended: z.array(
    z.object({
      rotation_id: z.string(),
      why: z.string().max(300),
    })
  ),
  data_caveats: z.array(z.string().max(300)).max(4),
});

export type RotationAdvice = z.infer<typeof rotationAdviceSchema>;

export function validateAdvice(
  raw: unknown,
  candidateIds: string[],
  candidates: ScoredCandidate[]
): RotationAdvice {
  const parsed = rotationAdviceSchema.parse(raw);
  const ranks = parsed.rotations.map((r) => r.rank).sort();
  if (ranks.join() !== "1,2,3") {
    throw new Error("rotations must have ranks 1, 2, 3");
  }
  for (const rot of parsed.rotations) {
    if (!candidateIds.includes(rot.rotation_id)) {
      throw new Error(`unknown rotation_id ${rot.rotation_id}`);
    }
    const cand = candidates.find((c) => c.rotation_id === rot.rotation_id);
    if (!cand) continue;
    // Season crops are overwritten from scorer after LLM call (BUILD_GUIDE §4.4).
  }
  return parsed;
}

export function mergeAdvice(
  llm: RotationAdvice,
  candidates: ScoredCandidate[],
  top3Ids: string[]
): RotationAdvice {
  const byId = new Map(candidates.map((c) => [c.rotation_id, c]));
  const rotations = llm.rotations.map((rot) => {
    const cand = byId.get(rot.rotation_id);
    if (!cand) return rot;
    return {
      ...rot,
      seasons: cand.seasons,
      scores: cand.scores,
      water_use: {
        irrigation_mm: cand.irrigation_mm,
        change_vs_current_pct: cand.change_vs_current_pct,
        note: rot.water_use.note,
      },
    };
  });
  const picked = rotations
    .filter((r) => top3Ids.includes(r.rotation_id))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);
  if (picked.length < 3) {
    const ids = new Set(picked.map((p) => p.rotation_id));
    for (const c of candidates) {
      if (picked.length >= 3) break;
      if (ids.has(c.rotation_id)) continue;
      picked.push({
        rank: picked.length + 1,
        rotation_id: c.rotation_id,
        name: c.name,
        seasons: c.seasons,
        scores: c.scores,
        water_use: {
          irrigation_mm: c.irrigation_mm,
          change_vs_current_pct: c.change_vs_current_pct,
          note: "From rule-based scorer.",
        },
        soil_health_effect: {
          direction: "neutral",
          explanation: "See scores.",
        },
        reasons: ["Ranked by the rule-based scorer."],
        risks: [],
        confidence: { level: "medium", uncertainty_note: "Filled from scorer." },
      });
      ids.add(c.rotation_id);
    }
  }
  return { ...llm, rotations: picked };
}

export function scorerFallbackAdvice(
  location: { upazila: string; union: string },
  candidates: ScoredCandidate[],
  soil: { ph_median: number | null; om_pct: number | null }
): RotationAdvice {
  const top3 = [...candidates]
    .sort((a, b) => b.scores.overall - a.scores.overall)
    .slice(0, 3);
  return {
    location,
    summary:
      "These three rotations scored highest for your field and priorities. AI explanations were unavailable; reasons below are from the rule-based scorer.",
    rotations: top3.map((c, i) => ({
      rank: i + 1,
      rotation_id: c.rotation_id,
      name: c.name,
      seasons: c.seasons,
      scores: c.scores,
      water_use: {
        irrigation_mm: c.irrigation_mm,
        change_vs_current_pct: c.change_vs_current_pct,
        note: `Estimated irrigation ${c.irrigation_mm} mm for the full rotation.`,
      },
      soil_health_effect: {
        direction: c.scores.soil_health >= 55 ? "improves" : "neutral",
        explanation: `Soil health score ${c.scores.soil_health}; organic matter about ${soil.om_pct ?? "unknown"}%.`,
      },
      reasons: [
        `Overall score ${c.scores.overall} from your priority weights.`,
        `Water score ${c.scores.water}; irrigation change ${c.change_vs_current_pct}% vs your current pattern.`,
        soil.ph_median != null
          ? `Union soil pH about ${soil.ph_median}.`
          : "Soil data from SRDI union samples.",
      ],
      risks: [],
      confidence: {
        level: "medium",
        uncertainty_note: "AI explanation unavailable; ranking from deterministic scorer only.",
      },
    })),
    not_recommended: [],
    data_caveats: ["Explanation generated offline from the rule-based scorer."],
  };
}
