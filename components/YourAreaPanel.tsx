import en from "@/i18n/en.json";
import { currentBarindSeason, seasonClimateSnapshot } from "@/lib/upcomingSeason";
import type { ClimateSummary, SatelliteSummary, UnionSoilProfile } from "@/lib/types";

function na(v: number | string | null | undefined) {
  if (v == null || v === "") return en.data.notAvailable;
  return String(v);
}

export function YourAreaPanel({
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
    <div className="stack">
      <h2>{en.results.yourArea}</h2>
      <div>
        <h3>Soil</h3>
        <ul className="plain-list">
          <li>pH: {na(soil.ph_median)}</li>
          <li>Organic matter: {soil.om_pct != null ? `${soil.om_pct}%` : en.data.notAvailable}</li>
          <li>P: {na(soil.p_ppm_median)} ppm</li>
          <li>EC: {na(soil.ec_median)}</li>
          <li>Texture: {na(soil.texture)}</li>
          <li>Land type: {na(soil.land_type)}</li>
          <li>Drainage: {na(soil.drainage)}</li>
        </ul>
        <a href={soil.source_url} target="_blank" rel="noreferrer">
          {soil.source}
        </a>
      </div>
      <div>
        <h3>NASA POWER</h3>
        <p>{snap.seasonLabel}</p>
        <p>Rain (normal): {na(snap.rainNormalMm)} mm</p>
        {snap.rainAnomalyPct != null && (
          <p>
            Recent rain is {snap.rainAnomalyPct > 0 ? `${snap.rainAnomalyPct}% above` : `${Math.abs(snap.rainAnomalyPct)}% below`} the average.
          </p>
        )}
        <p>Mean Tmax (normal): {na(snap.tmaxNormalC)} °C</p>
      </div>
      {(satellite.rabi_rootzone_mean > 0 || latestNdvi != null) && (
        <div>
          <h3>SMAP and NDVI, cached</h3>
          {satellite.fallback && <p>Nearest cached NASA point for this union.</p>}
          {satellite.rabi_rootzone_mean > 0 && (
            <p>Rabi root-zone moisture: {satellite.rabi_rootzone_mean.toFixed(3)} m³/m³</p>
          )}
          {latestNdvi != null && <p>Latest NDVI: {latestNdvi.toFixed(2)}</p>}
        </div>
      )}
    </div>
  );
}
