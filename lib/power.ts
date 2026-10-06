import fs from "fs";
import { cacheKey, readCache, writeCache } from "./cache";
import { samplesPath } from "./paths";
import type { ClimateSummary } from "./types";

const FILL = -999;
const DAYS: Record<string, number> = {
  JAN: 31,
  FEB: 28,
  MAR: 31,
  APR: 30,
  MAY: 31,
  JUN: 30,
  JUL: 31,
  AUG: 31,
  SEP: 30,
  OCT: 31,
  NOV: 30,
  DEC: 31,
};

const SEASON_MONTHS = {
  rabi: ["NOV", "DEC", "JAN", "FEB", "MAR"],
  kharif1: ["MAR", "APR", "MAY", "JUN"],
  kharif2: ["JUL", "AUG", "SEP", "OCT"],
} as const;

function seasonTmaxMean(climTmax: Record<string, number>, months: readonly string[]): number | null {
  const vals = months.map((m) => climTmax[m]).filter((v) => v != null && !isMissing(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function powerGridKey(lat: number, lon: number): string {
  const latCell = Math.round(lat * 2) / 2;
  const lonCell = Math.round(lon / 0.625) * 0.625;
  return `${latCell.toFixed(2)}_${lonCell.toFixed(3)}`;
}

function isMissing(v: number) {
  return v == null || Number.isNaN(v) || v <= FILL + 1;
}

function monthRainFromClim(params: Record<string, number>, month: string): number {
  const rate = params[month];
  if (isMissing(rate)) return 0;
  return rate * (DAYS[month] ?? 30);
}

function seasonRainClim(
  params: Record<string, number>,
  months: readonly string[]
): number {
  return months.reduce((sum, m) => sum + monthRainFromClim(params, m), 0);
}

type PowerFeature = {
  properties?: { parameter?: Record<string, Record<string, number>> };
};

function loadSampleJson(name: string): PowerFeature {
  return JSON.parse(fs.readFileSync(samplesPath(name), "utf8"));
}

async function fetchPower(endpoint: "climatology" | "monthly" | "daily", params: {
  lat: number;
  lon: number;
  start: string;
  end: string;
}): Promise<PowerFeature | null> {
  const paramList =
    endpoint === "climatology"
      ? "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,GWETROOT"
      : "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,GWETROOT,GWETTOP,RH2M,ALLSKY_SFC_SW_DWN";
  const url = new URL(
    `https://power.larc.nasa.gov/api/temporal/${endpoint}/point`
  );
  url.searchParams.set("parameters", paramList);
  url.searchParams.set("community", "AG");
  url.searchParams.set("latitude", String(params.lat));
  url.searchParams.set("longitude", String(params.lon));
  url.searchParams.set("start", params.start);
  url.searchParams.set("end", params.end);
  url.searchParams.set("format", "JSON");
  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return (await res.json()) as PowerFeature;
  } catch {
    return null;
  }
}

function monthlyKeyToMonth(key: string): number {
  const s = key.slice(-2);
  return parseInt(s, 10);
}

function seasonRainFromMonthly(
  pre: Record<string, number>,
  months: number[]
): number | null {
  const vals: number[] = [];
  for (const [k, rate] of Object.entries(pre)) {
    if (k.endsWith("13")) continue;
    const mo = monthlyKeyToMonth(k);
    if (!months.includes(mo)) continue;
    if (isMissing(rate)) continue;
    const dayKey = Object.keys(DAYS)[mo - 1];
    const days = dayKey ? DAYS[dayKey]! : 30;
    vals.push(rate * days);
  }
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / (vals.length / months.length);
}

function countHotDays(daily: PowerFeature, months: number[]): number | null {
  const tmax = daily.properties?.parameter?.T2M_MAX;
  if (!tmax) return null;
  let hot = 0;
  let total = 0;
  for (const [date, val] of Object.entries(tmax)) {
    const mo = parseInt(date.slice(4, 6), 10);
    if (!months.includes(mo)) continue;
    if (isMissing(val)) continue;
    total++;
    if (val >= 35) hot++;
  }
  if (!total) return null;
  return hot / (total / 365) / (months.length / 12);
}

function gwetSeasonMean(monthly: PowerFeature, months: number[]): number | null {
  const gw = monthly.properties?.parameter?.GWETROOT;
  if (!gw) return null;
  const vals: number[] = [];
  for (const [k, v] of Object.entries(gw)) {
    if (k.endsWith("13")) continue;
    const mo = monthlyKeyToMonth(k);
    if (!months.includes(mo)) continue;
    if (!isMissing(v)) vals.push(v);
  }
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export async function getClimateSummary(lat: number, lon: number): Promise<ClimateSummary> {
  const grid_key = powerGridKey(lat, lon);
  const cached = readCache<ClimateSummary>(cacheKey("climate_summary", { grid_key }));
  if (cached) return { ...cached, lat, lon };

  let clim = await fetchPower("climatology", {
    lat,
    lon,
    start: "2001",
    end: "2020",
  });
  let monthly = await fetchPower("monthly", {
    lat,
    lon,
    start: "2014",
    end: "2024",
  });
  let daily = await fetchPower("daily", {
    lat,
    lon,
    start: "20140101",
    end: "20241231",
  });

  if (!clim) clim = loadSampleJson("power_climatology.json");
  if (!monthly) monthly = loadSampleJson("power_monthly.json");
  if (!daily) daily = loadSampleJson("power_daily.json");

  const climPre = clim.properties?.parameter?.PRECTOTCORR ?? {};
  const climTmax = clim.properties?.parameter?.T2M_MAX ?? {};

  const monthly_rain_normal = Object.keys(DAYS).map((month) => ({
    month,
    mm: monthRainFromClim(climPre, month),
  }));
  const monthly_tmax_normal = Object.keys(DAYS).map((month) => ({
    month,
    c: climTmax[month] ?? 0,
  }));

  const preM = monthly.properties?.parameter?.PRECTOTCORR ?? {};

  const summary: ClimateSummary = {
    lat,
    lon,
    grid_key,
    rabi_rain_normal_mm: seasonRainClim(climPre, SEASON_MONTHS.rabi),
    kharif1_rain_normal_mm: seasonRainClim(climPre, SEASON_MONTHS.kharif1),
    kharif2_rain_normal_mm: seasonRainClim(climPre, SEASON_MONTHS.kharif2),
    rabi_rain_last10_mean_mm: seasonRainFromMonthly(preM, [11, 12, 1, 2, 3]),
    kharif1_rain_last10_mean_mm: seasonRainFromMonthly(preM, [3, 4, 5, 6]),
    kharif2_rain_last10_mean_mm: seasonRainFromMonthly(preM, [7, 8, 9, 10]),
    hot_days_feb_mar: countHotDays(daily, [2, 3]),
    hot_days_apr_may: countHotDays(daily, [4, 5]),
    cold_days_dec_jan: countHotDays(
      {
        properties: {
          parameter: {
            T2M_MAX: Object.fromEntries(
              Object.entries(daily.properties?.parameter?.T2M_MIN ?? {}).map(([k, v]) => [
                k,
                v <= 10 ? 1 : 0,
              ])
            ),
          },
        },
      },
      [12, 1]
    ),
    gwetroot_rabi_mean: gwetSeasonMean(monthly, [11, 12, 1, 2, 3, 4]),
    smap_rootzone_rabi_m3m3: null,
    smap_rootzone_pctl: null,
    rabi_tmax_normal_c: seasonTmaxMean(climTmax, SEASON_MONTHS.rabi),
    kharif1_tmax_normal_c: seasonTmaxMean(climTmax, SEASON_MONTHS.kharif1),
    kharif2_tmax_normal_c: seasonTmaxMean(climTmax, SEASON_MONTHS.kharif2),
    monthly_rain_normal,
    monthly_tmax_normal,
    sources: [
      "NASA POWER (climatology 2001–2020, monthly/daily)",
      "https://power.larc.nasa.gov/docs/services/api/",
    ],
  };

  writeCache(cacheKey("climate_summary", { grid_key }), summary);
  return summary;
}
