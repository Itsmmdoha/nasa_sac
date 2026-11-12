import type { ClimateSummary, SeasonKey } from "./types";

function dhakaYearMonth(now: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return { year, month };
}

/** Barind season from calendar month (Asia/Dhaka). */
export function currentBarindSeason(now = new Date()): SeasonKey {
  const { month } = dhakaYearMonth(now);
  if (month >= 11 || month <= 3) return "rabi";
  if (month >= 4 && month <= 6) return "kharif1";
  return "kharif2";
}

/** Season id. Jan–Mar still belongs to the rabi that started the previous November. */
export function seasonKey(now = new Date()): string {
  const { year, month } = dhakaYearMonth(now);
  const season = currentBarindSeason(now);
  const startYear = season === "rabi" && month <= 3 ? year - 1 : year;
  return `${startYear}-${season}`;
}

export function previousSeasonKey(key: string): string {
  const [yearText, season] = key.split("-");
  const year = Number(yearText);
  if (season === "rabi") return `${year}-kharif2`;
  if (season === "kharif1") return `${year - 1}-rabi`;
  return `${year}-kharif1`;
}

export function seasonClimateSnapshot(
  climate: ClimateSummary,
  season: SeasonKey
): {
  seasonLabel: string;
  rainNormalMm: number | null;
  rainRecentMm: number | null;
  rainAnomalyPct: number | null;
  tmaxNormalC: number | null;
} {
  const labels: Record<SeasonKey, string> = {
    rabi: "Rabi (Nov–Mar)",
    kharif1: "Kharif-1 (Mar–Jun)",
    kharif2: "Kharif-2 (Jul–Oct)",
  };
  const rainNormal =
    season === "rabi"
      ? climate.rabi_rain_normal_mm
      : season === "kharif1"
        ? climate.kharif1_rain_normal_mm
        : climate.kharif2_rain_normal_mm;
  const rainRecent =
    season === "rabi"
      ? climate.rabi_rain_last10_mean_mm
      : season === "kharif1"
        ? climate.kharif1_rain_last10_mean_mm
        : climate.kharif2_rain_last10_mean_mm;
  let rainAnomalyPct: number | null = null;
  if (rainNormal != null && rainRecent != null && rainNormal > 0) {
    rainAnomalyPct = Math.round(((rainRecent - rainNormal) / rainNormal) * 100);
  }
  const tmaxNormalC =
    season === "rabi"
      ? climate.rabi_tmax_normal_c
      : season === "kharif1"
        ? climate.kharif1_tmax_normal_c
        : climate.kharif2_tmax_normal_c;

  return {
    seasonLabel: labels[season],
    rainNormalMm: rainNormal,
    rainRecentMm: rainRecent,
    rainAnomalyPct,
    tmaxNormalC,
  };
}
