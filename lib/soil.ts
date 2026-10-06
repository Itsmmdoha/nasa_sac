import fs from "fs";
import { dataPath } from "./paths";
import type { UnionSoilProfile } from "./types";

const SRDI_URL =
  "https://map2.cropzoning.gov.bd/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature";

export const BARC_CROP_MAP: Record<string, string> = {
  boro: "Boro",
  t_aman: "Aman",
  wheat: "Wheat",
  maize: "Maize",
  mustard: "Mustard",
  lentil: "Lentil",
  chickpea: "Gram",
  mungbean: "Mung",
  potato: "Potato",
};

const FRS_CROP_NAMES: Record<string, string> = {
  boro: "Boro rice",
  t_aman: "T.Aman rice",
  wheat: "Wheat",
  mustard: "Mustard",
  lentil: "Lentil",
};

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0]!.split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

/** Treat zero P and EC as missing (BUILD_GUIDE §5). */
export function sanitizeNutrient(
  value: number | null | undefined,
  field: "p" | "ec"
): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (field === "p" && value === 0) return null;
  if (field === "ec" && value === 0) return null;
  return value;
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function mode(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | null = null;
  let max = 0;
  for (const [k, c] of counts) {
    if (c > max) {
      max = c;
      best = k;
    }
  }
  return best;
}

let sampleRows: Record<string, string>[] | null = null;
let landRows: Record<string, string>[] | null = null;
let frsRows: Record<string, string>[] | null = null;
let barcRows: Record<string, string>[] | null = null;

function loadSamples() {
  if (!sampleRows) {
    sampleRows = parseCsv(fs.readFileSync(dataPath("srdi", "srdi_sample.csv"), "utf8"));
  }
  return sampleRows;
}

function loadLand() {
  if (!landRows) {
    landRows = parseCsv(fs.readFileSync(dataPath("srdi", "srdi_land_units.csv"), "utf8"));
  }
  return landRows;
}

function loadFrs() {
  if (!frsRows) {
    frsRows = parseCsv(fs.readFileSync(dataPath("srdi", "srdi_frs_fertilizer.csv"), "utf8"));
  }
  return frsRows;
}

function loadBarc() {
  if (!barcRows) {
    barcRows = parseCsv(
      fs.readFileSync(dataPath("srdi", "barc_suitability_pilot.csv"), "utf8")
    );
  }
  return barcRows;
}

export function getUnionSoilProfile(upazila: string, union: string): UnionSoilProfile {
  const samples = loadSamples().filter((r) => r.upazila === upazila && r.union === union);
  const phs = samples.map((r) => parseFloat(r.ph)).filter((n) => !Number.isNaN(n));
  const oms = samples.map((r) => parseFloat(r.om_pct)).filter((n) => !Number.isNaN(n));
  const ps = samples
    .map((r) => sanitizeNutrient(parseFloat(r.p_ppm), "p"))
    .filter((n): n is number => n != null);
  const ecs = samples
    .map((r) => sanitizeNutrient(parseFloat(r.ec), "ec"))
    .filter((n): n is number => n != null);

  const land = loadLand().filter((r) => r.upazila === upazila);
  const byUnit = new Map<string, Record<string, string>>();
  for (const row of land) {
    if (!byUnit.has(row.map_unit)) byUnit.set(row.map_unit, row);
  }
  const phClassArea: Record<string, number> = {};
  let totalHa = 0;
  for (const row of byUnit.values()) {
    const ha = parseFloat(row.map_unit_area_ha) || 0;
    const cls = row.reaction_ph_class || "Unknown";
    phClassArea[cls] = (phClassArea[cls] ?? 0) + ha;
    totalHa += ha;
  }
  if (totalHa > 0) {
    for (const k of Object.keys(phClassArea)) {
      phClassArea[k] = phClassArea[k]! / totalHa;
    }
  }

  const frs: UnionSoilProfile["frs"] = {};
  const frsForUnion = loadFrs().filter((r) => r.upazila === upazila && r.union === union);
  for (const [cropId, cropName] of Object.entries(FRS_CROP_NAMES)) {
    const rows = frsForUnion.filter((r) => r.crop === cropName);
    if (!rows.length) continue;
    const pick = (nutrient: string, fert: string) => {
      const row = rows.find((r) => r.nutrient === nutrient && r.fertilizer.startsWith(fert));
      return row ? parseFloat(row.kg_per_ha) : undefined;
    };
    frs[cropId] = {
      urea_kg_ha: pick("N", "Urea"),
      tsp_kg_ha: pick("P", "TSP"),
      mop_kg_ha: pick("K", "MoP"),
      lime_kg_ha:
        pick("pH (lime)", "Lime") ??
        rows.find((r) => r.fertilizer === "Lime")
          ? parseFloat(rows.find((r) => r.fertilizer === "Lime")!.kg_per_ha)
          : undefined,
    };
  }

  const geocode = samples[0]?.upazila_geocode ?? (upazila === "Godagari" ? "508134" : "508194");

  return {
    upazila,
    union,
    ph_median: median(phs),
    om_pct: median(oms),
    p_ppm_median: median(ps),
    ec_median: median(ecs),
    texture: mode(samples.map((r) => r.texture)),
    land_type: mode(samples.map((r) => r.land_type)),
    drainage: mode(Array.from(byUnit.values()).map((r) => r.drainage)),
    ph_class_area: phClassArea,
    frs,
    sample_count: samples.length,
    source: "SRDI via BARC CZIS",
    source_url: `${SRDI_URL}&typeName=wsBARC:upazila_sol_${geocode}&outputFormat=application/json&srsName=EPSG:4326`,
  };
}

export type BarcFit = { score: number; pct_suitable_or_better: number };

export function getBarcFit(upazila: string, cropId: string): BarcFit {
  const barcName = BARC_CROP_MAP[cropId];
  if (!barcName) return { score: 0.5, pct_suitable_or_better: 50 };
  const row = loadBarc().find((r) => r.upazila === upazila && r.crop === barcName);
  if (!row) return { score: 0.5, pct_suitable_or_better: 50 };
  const vs = parseFloat(row.very_suitable_ha) || 0;
  const s = parseFloat(row.suitable_ha) || 0;
  const ms = parseFloat(row.moderately_suitable_ha) || 0;
  const mS = parseFloat(row.marginally_suitable_ha) || 0;
  const ns = parseFloat(row.not_suitable_ha) || 0;
  const total = vs + s + ms + mS + ns || 1;
  const score =
    (vs * 1 + s * 0.8 + ms * 0.6 + mS * 0.3 + ns * 0) / total;
  const pct = parseFloat(row.pct_suitable_or_better) || 0;
  return { score, pct_suitable_or_better: pct };
}
