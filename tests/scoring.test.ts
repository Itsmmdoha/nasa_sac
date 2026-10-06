import { describe, expect, it } from "vitest";
import {
  buildSeasonCells,
  heatFit,
  loadCrops,
  scoreRotations,
  soilFit,
  waterFit,
} from "@/lib/scoring";
import type { ClimateSummary, FarmerInput, UnionSoilProfile } from "@/lib/types";

const kalmaSoil: UnionSoilProfile = {
  upazila: "Tanore",
  union: "Kalma",
  ph_median: 6.2,
  om_pct: 1.7,
  p_ppm_median: null,
  ec_median: null,
  texture: "Clay Loam",
  land_type: "High",
  drainage: "Imperfectly drained",
  ph_class_area: { "Moderately Acidic": 0.87 },
  frs: { lentil: { lime_kg_ha: 100 } },
  sample_count: 30,
  source: "SRDI via BARC CZIS",
  source_url: "https://example.com",
};

const climate: ClimateSummary = {
  lat: 24.68,
  lon: 88.54,
  grid_key: "24.50_88.500",
  rabi_rain_normal_mm: 31,
  kharif1_rain_normal_mm: 419,
  kharif2_rain_normal_mm: 820,
  rabi_rain_last10_mean_mm: 30,
  kharif1_rain_last10_mean_mm: 400,
  kharif2_rain_last10_mean_mm: 810,
  hot_days_feb_mar: 5,
  hot_days_apr_may: 20,
  cold_days_dec_jan: 3,
  gwetroot_rabi_mean: 0.4,
  smap_rootzone_rabi_m3m3: 0.15,
  smap_rootzone_pctl: 35,
  monthly_rain_normal: [],
  monthly_tmax_normal: [],
  sources: [],
};

const boroFarmer: FarmerInput = {
  upazila: "Tanore",
  union: "Kalma",
  last_crops: { rabi: "boro", kharif1: "fallow", kharif2: "t_aman" },
  budget: "medium",
  water: "limited",
  can_sell: ["rice", "mustard", "lentil"],
  priorities: { profit: 3, soil: 4, water: 5 },
};

describe("buildSeasonCells", () => {
  it("uses crop calendar for boro in rabi slot", () => {
    const cells = buildSeasonCells({
      rabi: { crop: "boro" },
      kharif1: { crop: "fallow" },
      kharif2: { crop: "t_aman" },
    });
    expect(cells.rabi.months).toBe("Jan–May");
    expect(cells.kharif2.months).toBe("Jul–Nov");
  });
});

describe("waterFit", () => {
  it("limits high-water boro on limited irrigation", () => {
    const boro = loadCrops().find((c) => c.id === "boro")!;
    const fit = waterFit(boro, boroFarmer, 35, "rabi", climate);
    expect(fit).toBeLessThan(0.35);
  });

  it("treats t_aman leniently in monsoon", () => {
    const aman = loadCrops().find((c) => c.id === "t_aman")!;
    const fit = waterFit(aman, boroFarmer, 35, "kharif2", climate);
    expect(fit).toBeGreaterThan(0.8);
  });
});

describe("soilFit", () => {
  it("scores lentil reasonably on Kalma-like soil", () => {
    const lentil = loadCrops().find((c) => c.id === "lentil")!;
    expect(soilFit(lentil, kalmaSoil, "Tanore")).toBeGreaterThan(0.6);
  });
});

describe("heatFit", () => {
  it("penalizes heat-sensitive crops when hot days high", () => {
    const mustard = loadCrops().find((c) => c.id === "mustard")!;
    const cool = heatFit(mustard, { ...climate, hot_days_feb_mar: 0 }, "rabi");
    const hot = heatFit(mustard, { ...climate, hot_days_feb_mar: 20 }, "rabi");
    expect(cool).toBeGreaterThan(hot);
  });
});

describe("scoreRotations", () => {
  it("ranks low-water rotations above Boro baseline for water priority", () => {
    const { candidates } = scoreRotations({
      farmer: boroFarmer,
      soil: kalmaSoil,
      climate,
    });
    const r1 = candidates.find((c) => c.rotation_id === "R1");
    const lowWater = candidates.filter((c) =>
      ["R3", "R5", "R7"].includes(c.rotation_id)
    );
    expect(lowWater.length).toBeGreaterThan(0);
    for (const r of lowWater) {
      if (r1) expect(r.scores.water).toBeGreaterThan(r1.scores.water);
    }
    expect(candidates[0]!.scores.water).toBeGreaterThanOrEqual(50);
  });

  it("water-first priorities favor higher water scores at rank 1", () => {
    const waterHeavy = scoreRotations({
      farmer: { ...boroFarmer, priorities: { water: 5, soil: 3, profit: 1 } },
      soil: kalmaSoil,
      climate,
    }).candidates[0]!;
    const profitHeavy = scoreRotations({
      farmer: { ...boroFarmer, priorities: { profit: 5, soil: 2, water: 1 } },
      soil: kalmaSoil,
      climate,
    }).candidates[0]!;
    expect(waterHeavy.scores.water).toBeGreaterThanOrEqual(profitHeavy.scores.water - 5);
  });
});
