/**
 * ponytail: crop traits & margins are placeholders (BUILD_GUIDE §6.7); tune against BRRI/BARI sheets.
 */
import fs from "fs";
import { dataPath } from "./paths";
import { getBarcFit } from "./soil";
import type {
  ClimateSummary,
  CropDef,
  FarmerInput,
  RotationDef,
  ScoredCandidate,
  SeasonKey,
  UnionSoilProfile,
} from "./types";

const WATER_MM: Record<FarmerInput["water"], number> = {
  none: 0,
  limited: 150,
  reliable: 600,
  plenty: 1200,
};

const BUDGET_MULT: Record<FarmerInput["budget"], Record<CropDef["cost_tier"], number>> = {
  low: { low: 1, medium: 0.7, high: 0.4 },
  medium: { low: 1, medium: 0.85, high: 0.55 },
  high: { low: 1, medium: 1, high: 0.75 },
};

const SELL_ALIASES: Record<string, string[]> = {
  rice: ["boro", "t_aman"],
  mustard: ["mustard"],
  lentil: ["lentil"],
  wheat: ["wheat"],
  maize: ["maize"],
  pulse: ["lentil", "chickpea", "mungbean"],
  potato: ["potato"],
};

let crops: CropDef[] | null = null;
let rotations: RotationDef[] | null = null;

export function loadCrops(): CropDef[] {
  if (!crops) {
    const j = JSON.parse(fs.readFileSync(dataPath("seed", "crops.json"), "utf8"));
    crops = j.crops as CropDef[];
  }
  return crops!;
}

export function loadRotations(): RotationDef[] {
  if (!rotations) {
    const j = JSON.parse(fs.readFileSync(dataPath("seed", "rotations.json"), "utf8"));
    rotations = j.rotations as RotationDef[];
  }
  return rotations!;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function cropById(id: string): CropDef {
  return loadCrops().find((c) => c.id === id) ?? loadCrops().find((c) => c.id === "fallow")!;
}

export function monthsForCropInSlot(cropId: string, slot: SeasonKey): string {
  const crop = cropById(cropId);
  const m = crop.calendar_by_slot?.[slot];
  if (m && m !== "—") return m;
  return cropId === "fallow" ? "—" : "—";
}

/** Scorer-owned season cells (crop + calendar months from seed). */
export function buildSeasonCells(
  slots: Record<SeasonKey, { crop: string }>
): Record<SeasonKey, { crop: string; months: string }> {
  return {
    rabi: { crop: slots.rabi.crop, months: monthsForCropInSlot(slots.rabi.crop, "rabi") },
    kharif1: {
      crop: slots.kharif1.crop,
      months: monthsForCropInSlot(slots.kharif1.crop, "kharif1"),
    },
    kharif2: {
      crop: slots.kharif2.crop,
      months: monthsForCropInSlot(slots.kharif2.crop, "kharif2"),
    },
  };
}

export function waterFit(
  crop: CropDef,
  farmer: FarmerInput,
  smapPctl: number | null,
  season: SeasonKey,
  climate: ClimateSummary
): number {
  if (crop.id === "fallow") return 1;
  let need = crop.irrigation_mm;
  if (crop.id === "t_aman") {
    const k2 = climate.kharif2_rain_normal_mm ?? 800;
    need = clamp(100 - k2 / 20, 0, 100);
  }
  if (smapPctl != null) {
    if (smapPctl < 30) need *= 1.1;
    else if (smapPctl > 70) need *= 0.9;
  }
  const available = WATER_MM[farmer.water];
  if (need <= 0) return 1;
  return clamp(available / need, 0, 1);
}

export function heatFit(crop: CropDef, climate: ClimateSummary, season: SeasonKey): number {
  if (crop.id === "fallow" || !crop.heat_sensitive_months.length) return 1;
  const hot =
    season === "rabi"
      ? climate.hot_days_feb_mar
      : season === "kharif1"
        ? climate.hot_days_apr_may
        : null;
  const days = hot ?? 0;
  return clamp(1 - days / Math.max(crop.heat_days_tolerance, 1), 0, 1);
}

export function phFit(crop: CropDef, ph: number | null): number {
  if (ph == null || crop.id === "fallow") return 0.7;
  if (ph >= crop.ph_min && ph <= crop.ph_max) return 1;
  const dist =
    ph < crop.ph_min ? crop.ph_min - ph : ph - crop.ph_max;
  return clamp(1 - (dist / 0.5) * 0.25, 0, 1);
}

export function soilFit(
  crop: CropDef,
  soil: UnionSoilProfile,
  upazila: string
): number {
  if (crop.id === "fallow") return 1;
  const ph = phFit(crop, soil.ph_median);
  let drainage = 0.7;
  if (soil.drainage && crop.drainage_ok.length) {
    drainage = crop.drainage_ok.some((d) => soil.drainage!.includes(d.split(" ")[0]!))
      ? 1
      : 0.5;
  }
  const land = soil.land_type?.toLowerCase().includes("high") ? 1 : 0.85;
  const barc = getBarcFit(upazila, crop.id).score;
  return (ph + drainage + land + barc) / 4;
}

export function marketFit(crop: CropDef, farmer: FarmerInput): number {
  if (crop.id === "fallow") return 1;
  for (const sell of farmer.can_sell) {
    const ids = SELL_ALIASES[sell] ?? [sell];
    if (ids.includes(crop.id)) return 1;
  }
  return 0.3;
}

export function budgetFit(crop: CropDef, farmer: FarmerInput): number {
  if (crop.id === "fallow") return 1;
  return BUDGET_MULT[farmer.budget][crop.cost_tier];
}

function rotationIrrigation(rot: RotationDef): number {
  return (["rabi", "kharif1", "kharif2"] as SeasonKey[]).reduce((sum, s) => {
    const c = cropById(rot.seasons[s].crop);
    return sum + (c.id === "t_aman" ? Math.min(c.irrigation_mm, 80) : c.irrigation_mm);
  }, 0);
}

function matchesCurrent(rot: RotationDef, farmer: FarmerInput): boolean {
  return (
    rot.seasons.rabi.crop === farmer.last_crops.rabi &&
    rot.seasons.kharif1.crop === farmer.last_crops.kharif1 &&
    rot.seasons.kharif2.crop === farmer.last_crops.kharif2
  );
}

function findCurrentRotation(farmer: FarmerInput): RotationDef {
  const hit = loadRotations().find((r) => matchesCurrent(r, farmer));
  if (hit) return hit;
  return {
    rotation_id: "CURRENT",
    name: `${farmer.last_crops.rabi} – ${farmer.last_crops.kharif1} – ${farmer.last_crops.kharif2}`,
    seasons: buildSeasonCells({
      rabi: { crop: farmer.last_crops.rabi },
      kharif1: { crop: farmer.last_crops.kharif1 },
      kharif2: { crop: farmer.last_crops.kharif2 },
    }),
  };
}

function soilHealthScore(rot: RotationDef, soil: UnionSoilProfile): number {
  let s = 50;
  const cropsInRot = (["rabi", "kharif1", "kharif2"] as SeasonKey[]).map(
    (k) => cropById(rot.seasons[k].crop)
  );
  if (cropsInRot.some((c) => c.legume)) s += 20;
  const riceSeasons = cropsInRot.filter((c) => c.id === "boro" || c.id === "t_aman").length;
  if (riceSeasons <= 1) s += 10;
  const fallows = cropsInRot.filter((c) => c.id === "fallow").length;
  s -= fallows * 15;
  if (soil.ph_median != null && soil.ph_median < 6 && cropsInRot.some((c) => c.id === "boro")) {
    s -= 10;
  }
  return clamp(Math.round(s), 0, 100);
}

function historyBonus(rot: RotationDef, farmer: FarmerInput): number {
  let h = 0;
  const wasRiceRice =
    (farmer.last_crops.rabi === "boro" || farmer.last_crops.kharif2 === "t_aman") &&
    farmer.last_crops.kharif2 === "t_aman";
  const nowRice = ["rabi", "kharif1", "kharif2"].filter((k) => {
    const id = rot.seasons[k as SeasonKey].crop;
    return id === "boro" || id === "t_aman";
  }).length;
  if (wasRiceRice && nowRice < 2) h += 5;
  for (const fail of farmer.failed_crops ?? []) {
    if (Object.values(rot.seasons).some((s) => s.crop === fail)) h -= 10;
  }
  return h;
}

export type ScoreInput = {
  farmer: FarmerInput;
  soil: UnionSoilProfile;
  climate: ClimateSummary;
};

export type ScoreResult = {
  candidates: ScoredCandidate[];
  baseline_irrigation_mm: number;
  current_rotation_id: string;
};

export function scoreRotations(input: ScoreInput): ScoreResult {
  const { farmer, soil, climate } = input;
  const smapPctl = climate.smap_rootzone_pctl;
  const current = findCurrentRotation(farmer);
  const baselineIrr = rotationIrrigation(current);

  const scored = loadRotations().map((rot) => {
    const seasons = ["rabi", "kharif1", "kharif2"] as SeasonKey[];
    const water_fits: Record<SeasonKey, number> = { rabi: 0, kharif1: 0, kharif2: 0 };
    const heat_fits: Record<SeasonKey, number> = { rabi: 0, kharif1: 0, kharif2: 0 };
    const soil_fits: Record<SeasonKey, number> = { rabi: 0, kharif1: 0, kharif2: 0 };
    let profitAcc = 0;

    for (const s of seasons) {
      const crop = cropById(rot.seasons[s].crop);
      water_fits[s] = waterFit(crop, farmer, smapPctl, s, climate);
      heat_fits[s] = heatFit(crop, climate, s);
      soil_fits[s] = soilFit(crop, soil, farmer.upazila);
      profitAcc +=
        crop.relative_margin_index * marketFit(crop, farmer) * budgetFit(crop, farmer);
    }
    profitAcc /= seasons.length;

    const minWater = Math.min(...seasons.map((s) => water_fits[s]));
    const irr = rotationIrrigation(rot);
    return {
      rot,
      minWater,
      irr,
      water_fits,
      heat_fits,
      soil_fits,
      profitAcc,
    };
  });

  let pool = scored.filter((s) => s.minWater >= 0.3);
  if (pool.length < 3) pool = scored;

  const maxIrr = Math.max(...pool.map((s) => s.irr), baselineIrr, 1);

  const withScores = pool.map(({ rot, irr, water_fits, heat_fits, soil_fits, profitAcc }) => {
    const avgWaterFit =
      (water_fits.rabi + water_fits.kharif1 + water_fits.kharif2) / 3;
    const waterScore = Math.round(
      100 *
        (0.5 * (1 - irr / maxIrr) + 0.5 * Math.min(...Object.values(water_fits)))
    );
    const climate_risk = Math.round(
      100 *
        ((heat_fits.rabi + heat_fits.kharif1 + heat_fits.kharif2) / 3 +
          avgWaterFit) /
          2
    );
    const soil_health = soilHealthScore(rot, soil);
    const profit = Math.round(profitAcc * 100);

    const w = farmer.priorities;
    const sum = w.profit + w.soil + w.water;
    const overallRaw =
      (w.water / sum) * waterScore +
      (w.soil / sum) * soil_health +
      (w.profit / sum) * profit +
      (climate_risk / 100) * 10 +
      historyBonus(rot, farmer);

    const change =
      baselineIrr > 0 ? Math.round(((irr - baselineIrr) / baselineIrr) * 100) : 0;

    return {
      rotation_id: rot.rotation_id,
      name: rot.name,
      seasons: buildSeasonCells(rot.seasons),
      scores: {
        overall: clamp(Math.round(overallRaw), 0, 100),
        water: clamp(waterScore, 0, 100),
        soil_health: clamp(soil_health, 0, 100),
        profit: clamp(profit, 0, 100),
        climate_risk: clamp(climate_risk, 0, 100),
      },
      irrigation_mm: irr,
      change_vs_current_pct: change,
      sub_scores: { water_fits, heat_fits, soil_fits },
    } satisfies ScoredCandidate;
  });

  withScores.sort((a, b) => b.scores.overall - a.scores.overall);
  let top5 = withScores.slice(0, 5);
  const currentId = current.rotation_id;
  if (currentId !== "CURRENT" && !top5.some((c) => c.rotation_id === currentId)) {
    const cur = withScores.find((c) => c.rotation_id === currentId);
    if (cur) top5 = [...top5.slice(0, 4), cur];
  }

  return {
    candidates: top5,
    baseline_irrigation_mm: baselineIrr,
    current_rotation_id: current.rotation_id,
  };
}
