import { describe, expect, it } from "vitest";
import { scorerFallbackAdvice } from "@/lib/advice";
import type { ScoredCandidate } from "@/lib/types";

function candidate(id: string, overall: number): ScoredCandidate {
  const season = { crop: "lentil", months: "Nov–Feb" };
  return {
    rotation_id: id,
    name: id,
    seasons: { rabi: season, kharif1: season, kharif2: season },
    scores: { overall, water: 40, soil_health: 60, profit: 50, climate_risk: 30 },
    irrigation_mm: 120,
    change_vs_current_pct: -10,
    sub_scores: {
      water_fits: { rabi: 1, kharif1: 1, kharif2: 1 },
      heat_fits: { rabi: 1, kharif1: 1, kharif2: 1 },
      soil_fits: { rabi: 1, kharif1: 1, kharif2: 1 },
    },
  };
}

const location = { upazila: "Tanore", union: "Kalma" };
const soil = { ph_median: 6.2, om_pct: 1.7 };
const candidates = [candidate("a", 70), candidate("b", 90), candidate("c", 80)];

describe("scorerFallbackAdvice language", () => {
  it("writes English prose and keeps scores", () => {
    const advice = scorerFallbackAdvice(location, candidates, soil, "en");
    expect(advice.summary).toContain("rule-based scorer");
    expect(advice.rotations[0]?.rotation_id).toBe("b");
    expect(advice.rotations[0]?.scores.overall).toBe(90);
    expect(advice.rotations[0]?.water_use.irrigation_mm).toBe(120);
    expect(advice.rotations.map((r) => r.scores.overall)).toEqual([90, 80, 70]);
  });

  it("writes Bangla prose without changing scores", () => {
    const advice = scorerFallbackAdvice(location, candidates, soil, "bn");
    expect(advice.summary).toMatch(/[\u0980-\u09FF]/);
    expect(advice.rotations[0]?.reasons.join(" ")).toMatch(/[\u0980-\u09FF]/);
    expect(advice.data_caveats[0]).toMatch(/[\u0980-\u09FF]/);
    expect(advice.rotations.map((r) => r.scores)).toEqual(
      scorerFallbackAdvice(location, candidates, soil, "en").rotations.map((r) => r.scores)
    );
  });
});