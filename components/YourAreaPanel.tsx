import { Card } from "@/components/ui/card";
import en from "@/i18n/en.json";
import { currentBarindSeason, seasonClimateSnapshot } from "@/lib/upcomingSeason";
import type { ClimateSummary, SatelliteSummary, UnionSoilProfile } from "@/lib/types";

function na(v: number | string | null | undefined) {
  if (v == null || v === "") return en.data.notAvailable;
  return String(v);
}

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
  const season = currentBarindSeason();
  const snap = seasonClimateSnapshot(climate, season);
  const latestNdvi = satellite.ndvi_series?.length
    ? satellite.ndvi_series[satellite.ndvi_series.length - 1]!.ndvi
    : null;

  return (
    <Card className="space-y-3 text-sm text-[#333]">
      <h3 className="font-semibold text-[#14532d]">
        {en.results.yourArea}: {location.union}, {location.upazila}
      </h3>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[#333]">SRDI soil</p>
        <ul className="mt-1 space-y-0.5">
          <li>pH: {na(soil.ph_median)}</li>
          <li>Organic matter: {soil.om_pct != null ? `${soil.om_pct}%` : en.data.notAvailable}</li>
          <li>P: {na(soil.p_ppm_median)} ppm</li>
          <li>EC: {na(soil.ec_median)}</li>
          <li>Texture: {na(soil.texture)}</li>
          <li>Land type: {na(soil.land_type)}</li>
          <li>Drainage: {na(soil.drainage)}</li>
        </ul>
        <a
          href={soil.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs text-[#14532d] underline"
        >
          {soil.source}
        </a>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[#333]">NASA POWER</p>
        <p className="mt-1">{snap.seasonLabel}</p>
        <p>
          Rain (normal): {na(snap.rainNormalMm)} mm
          {snap.rainAnomalyPct != null && (
            <span>
              {" "}
              · recent vs average: {snap.rainAnomalyPct > 0 ? "+" : ""}
              {snap.rainAnomalyPct}%
            </span>
          )}
        </p>
        <p>Mean Tmax (normal): {na(snap.tmaxNormalC)} °C</p>
      </div>

      {(satellite.rabi_rootzone_mean > 0 || latestNdvi != null) && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#333]">
            SMAP / NDVI (cached)
          </p>
          {satellite.fallback && (
            <p className="text-xs text-[#333]">Nearest cached NASA point for this union.</p>
          )}
          {satellite.rabi_rootzone_mean > 0 && (
            <p>Rabi root-zone moisture: {satellite.rabi_rootzone_mean.toFixed(3)} m³/m³</p>
          )}
          {latestNdvi != null && <p>Latest NDVI: {latestNdvi.toFixed(2)}</p>}
        </div>
      )}
    </Card>
  );
}
