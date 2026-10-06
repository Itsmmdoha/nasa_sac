import fs from "fs";
import path from "path";
import { dataPath } from "./paths";
import type { SatelliteSummary } from "./types";
import { powerGridKey } from "./power";

type StoredSat = {
  id: string;
  lat: number;
  lon: number;
  rabi_rootzone_mean: number;
  smap_rootzone_pctl?: number;
  smap_monthly: { month: string; rootzone: number; surface: number }[];
  ndvi_series: { date: string; ndvi: number }[];
  source: string;
  fallback?: boolean;
};

const DEFAULT_ID = "godagari_pilot";

function loadStored(id: string): StoredSat | null {
  const file = dataPath("satellite", `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as StoredSat;
}

function listStored(): StoredSat[] {
  const dir = dataPath("satellite");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as StoredSat);
}

function nearest(lat: number, lon: number): StoredSat {
  const all = listStored();
  if (!all.length) {
    return {
      id: DEFAULT_ID,
      lat: 24.47,
      lon: 88.33,
      rabi_rootzone_mean: 0.15,
      smap_rootzone_pctl: 35,
      smap_monthly: [],
      ndvi_series: [],
      source: "Default pilot point (prefetch with scripts/appeears_pull.py)",
      fallback: true,
    };
  }
  let best = all[0]!;
  let bestD = Infinity;
  for (const s of all) {
    const d = (s.lat - lat) ** 2 + (s.lon - lon) ** 2;
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  if (bestD > 0.02) {
    return { ...best, fallback: true };
  }
  return best;
}

export function getSatelliteSummary(lat: number, lon: number): SatelliteSummary {
  const grid = powerGridKey(lat, lon);
  const byGrid = loadStored(`cell_${grid.replace(".", "_")}`);
  const base = byGrid ?? nearest(lat, lon);
  return {
    id: base.id,
    lat: base.lat,
    lon: base.lon,
    smap_monthly: base.smap_monthly,
    ndvi_series: base.ndvi_series,
    rabi_rootzone_mean: base.rabi_rootzone_mean,
    source: base.source,
    fallback: base.fallback,
  };
}

export function enrichClimateWithSatellite(
  climate: import("./types").ClimateSummary,
  sat: SatelliteSummary
): import("./types").ClimateSummary {
  return {
    ...climate,
    smap_rootzone_rabi_m3m3: sat.rabi_rootzone_mean,
    smap_rootzone_pctl: sat.fallback ? 50 : 35,
  };
}
