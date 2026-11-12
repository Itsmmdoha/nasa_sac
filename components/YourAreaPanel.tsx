"use client";

import { useLang } from "@/lib/i18n";
import { currentBarindSeason, seasonClimateSnapshot } from "@/lib/upcomingSeason";
import type { ClimateSummary, SatelliteSummary, UnionSoilProfile } from "@/lib/types";

export function YourAreaPanel({
  soil,
  climate,
  satellite,
}: {
  soil: UnionSoilProfile;
  climate: ClimateSummary;
  satellite: SatelliteSummary;
}) {
  const { t, f, num } = useLang();
  const season = currentBarindSeason();
  const snap = seasonClimateSnapshot(climate, season);
  const latestNdvi = satellite.ndvi_series?.length
    ? satellite.ndvi_series[satellite.ndvi_series.length - 1]!.ndvi
    : null;
  const na = (v: string | number | null | undefined, digits?: number) =>
    v == null || v === "" ? t.data.notAvailable : typeof v === "number" ? num(v, digits) : v;

  return (
    <div className="grid-3">
      <section className="card">
        <h3 style={{ marginBottom: 10 }}>{t.area.soil}</h3>
        <dl className="facts" style={{ gridTemplateColumns: "1fr" }}>
          <div><dt>{t.area.ph}</dt><dd>{na(soil.ph_median)}</dd></div>
          <div><dt>{t.area.om}</dt><dd>{soil.om_pct != null ? `${num(soil.om_pct)}%` : t.data.notAvailable}</dd></div>
          <div><dt>{t.area.p}</dt><dd>{soil.p_ppm_median != null ? `${num(soil.p_ppm_median)} ppm` : t.data.notAvailable}</dd></div>
          <div><dt>{t.area.texture}</dt><dd>{na(soil.texture)}</dd></div>
          <div><dt>{t.area.drainage}</dt><dd>{na(soil.drainage)}</dd></div>
        </dl>
        <a className="small" href={soil.source_url} target="_blank" rel="noreferrer" style={{ marginTop: 10, display: "inline-block" }}>
          {soil.source}
        </a>
      </section>
      <section className="card">
        <h3 style={{ marginBottom: 10 }}>{t.area.climate}</h3>
        <div className="stack">
          <div className="stat">
            <strong>{snap.rainNormalMm != null ? `${num(Math.round(snap.rainNormalMm))} mm` : "—"}</strong>
            <span>{t.area.rainNormal} · {t.seasons[season]}</span>
          </div>
          {snap.rainAnomalyPct != null ? (
            <p className={snap.rainAnomalyPct < 0 ? "badge red" : "badge blue"} style={{ alignSelf: "flex-start" }}>
              {t.area.rainRecent}:{" "}
              {snap.rainAnomalyPct >= 0
                ? f(t.area.rainAbove, { n: snap.rainAnomalyPct })
                : f(t.area.rainBelow, { n: Math.abs(snap.rainAnomalyPct) })}
            </p>
          ) : null}
          <div className="stat">
            <strong>{snap.tmaxNormalC != null ? `${num(snap.tmaxNormalC, 1)} °C` : "—"}</strong>
            <span>{t.area.tmax}</span>
          </div>
        </div>
      </section>
      <section className="card">
        <h3 style={{ marginBottom: 10 }}>{t.area.satellite}</h3>
        <div className="stack">
          <div className="stat">
            <strong>{satellite.rabi_rootzone_mean > 0 ? num(satellite.rabi_rootzone_mean, 3) : "—"}</strong>
            <span>{t.area.moisture} (m³/m³)</span>
          </div>
          <div className="stat">
            <strong>{latestNdvi != null ? num(latestNdvi, 2) : "—"}</strong>
            <span>{t.area.ndvi}</span>
          </div>
          {satellite.fallback ? <p className="small muted">{t.area.nearest}</p> : null}
        </div>
      </section>
    </div>
  );
}
