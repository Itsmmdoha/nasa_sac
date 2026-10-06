import type { ClimateSummary, SeasonKey } from "./types";

/** Barind season from calendar month (Asia/Dhaka). */
export function currentBarindSeason(now = new Date()): SeasonKey {
  const month = parseInt(
    new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", month: "numeric" }).format(now),
    10
  );
  if (month >= 11 || month <= 3) return "rabi";
  if (month >= 4 && month <= 6) return "kharif1";
  return "kharif2";
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
