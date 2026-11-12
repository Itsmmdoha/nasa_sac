import { z } from "zod";
import type { ScoredCandidate } from "./types";

export const explanationSchema = z.object({
  summary: z.string().min(1).max(800),
  reasons: z.array(z.string().min(1).max(400)).min(2).max(4),
  risks: z
    .array(
      z.object({
        risk: z.string().max(300),
        mitigation: z.string().max(300),
      })
    )
    .max(3),
  soil_direction: z.enum(["improves", "neutral", "degrades"]),
  soil_explanation: z.string().max(400),
  water_note: z.string().max(400),
  uncertainty_note: z.string().max(400),
  bn: z
    .object({
      summary: z.string().max(1200),
      reasons: z.array(z.string().max(600)).max(4),
      risks: z.array(z.object({ risk: z.string().max(400), mitigation: z.string().max(400) })).max(3),
      soil_explanation: z.string().max(600),
      water_note: z.string().max(600),
      uncertainty_note: z.string().max(600),
    })
    .optional(),
});

export type Explanation = z.infer<typeof explanationSchema>;

export function templateExplanation(
  candidate: ScoredCandidate,
  soil: { ph_median: number | null; om_pct?: number | null },
  zoneNote: string,
  marketNote: string
): Explanation {
  const summary = [candidate.name + " is the rotation for this season.", zoneNote, marketNote]
    .filter(Boolean)
    .join(" ");
  return {
    summary,
    reasons: [
      `Overall score ${candidate.scores.overall} from your priority weights.`,
      `Water score ${candidate.scores.water}; irrigation change ${candidate.change_vs_current_pct}% vs your current pattern.`,
      soil.ph_median != null
        ? `Union soil pH about ${soil.ph_median}.`
        : "Soil data from SRDI union samples.",
    ],
    risks: [],
    soil_direction: candidate.scores.soil_health >= 55 ? "improves" : "neutral",
    soil_explanation: `Soil health score ${candidate.scores.soil_health}; organic matter about ${
      soil.om_pct ?? "unknown"
    }%.`,
    water_note: `Estimated irrigation ${candidate.irrigation_mm} mm for the full rotation.`,
    uncertainty_note: "Language-model explanation unavailable. Reasons are from the rule-based scorer.",
  };
}

export function confidenceLevel(unsure: boolean, confidence: number | null): "low" | "medium" | "high" {
  if (unsure || (confidence != null && confidence < 0.55)) return "low";
  if (confidence != null && confidence >= 0.75) return "high";
  return "medium";
}
