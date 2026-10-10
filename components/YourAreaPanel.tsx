"use client";

import { useLocale } from "@/components/LocaleProvider";
import { Card } from "@/components/ui/card";
import { currentBarindSeason, seasonClimateSnapshot } from "@/lib/upcomingSeason";
import { dictLabel } from "@/lib/text";
import type { ClimateSummary, SatelliteSummary, UnionSoilProfile } from "@/lib/types";

export function YourAreaPanel({
  location,
  soil,
  climate,
  satellite,
}: {
  location: { upazila: string; union: string };
  soil: UnionSoilProfile;
  climate: ClimateSummary;
  satellite: SatelliteSummary;
}) {
  const { t } = useLocale();
  const season = currentBarindSeason();
  const snap = seasonClimateSnapshot(climate, season);
  const latestNdvi = satellite.ndvi_series?.length
    ? satellite.ndvi_series[satellite.ndvi_series.length - 1]!.ndvi
    : null;

  function na(v: number | string | null | undefined) {
    if (v == null || v === "") return t.data.notAvailable;
    if (typeof v === "number") {
      const text = String(v);
      return text.length > 8 ? String(Math.round(v * 100) / 100) : text;
    }
    return String(v);
  }

  const place = `${dictLabel(t.places.union, location.union)}, ${dictLabel(t.places.upazila, location.upazila)}`;

  return (
    <Card className="space-y-3 text-sm text-[#333]">
      <h3 className="font-semibold text-[#14532d]">
        {t.results.yourArea}: {place}
      </h3>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[#333]">{t.area.srdi}</p>
        <ul className="mt-1 space-y-0.5">
          <li>
            {t.area.ph}: {na(soil.ph_median)}
          </li>
          <li>
            {t.area.organicMatter}:{" "}
            {soil.om_pct != null ? `${soil.om_pct}%` : t.data.notAvailable}
          </li>
          <li>
            {t.area.phosphorus}: {na(soil.p_ppm_median)} ppm
          </li>
          <li>
            {t.area.ec}: {na(soil.ec_median)}
          </li>
          <li>
            {t.area.texture}: {na(soil.texture)}
          </li>
          <li>
            {t.area.landType}: {na(soil.land_type)}
          </li>
          <li>
            {t.area.drainage}: {na(soil.drainage)}
          </li>
        </ul>
        <a
          href={soil.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs text-[#14532d] underline"
        >
          {t.data.source}: {soil.source}
        </a>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[#333]">{t.area.power}</p>
        <p className="mt-1">{t.seasons[season]}</p>
        <p>
          {t.area.rainNormal}: {na(snap.rainNormalMm)} mm
          {snap.rainAnomalyPct != null && (
            <span>
              {` · ${t.area.recentVsAverage}: ${snap.rainAnomalyPct > 0 ? "+" : ""}${snap.rainAnomalyPct}%`}
            </span>
          )}
        </p>
        <p>
          {t.area.tmax}: {na(snap.tmaxNormalC)} °C
        </p>
      </div>

      {(satellite.rabi_rootzone_mean > 0 || latestNdvi != null) && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#333]">{t.area.smap}</p>
          {satellite.fallback && <p className="text-xs text-[#333]">{t.area.nearest}</p>}
          {satellite.rabi_rootzone_mean > 0 && (
            <p>
              {t.area.rabiMoisture}: {satellite.rabi_rootzone_mean.toFixed(3)} m³/m³
            </p>
          )}
          {latestNdvi != null && (
            <p>
              {t.area.ndvi}: {latestNdvi.toFixed(2)}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
