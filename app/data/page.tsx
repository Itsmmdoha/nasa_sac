"use client";

import { useEffect, useState } from "react";
import { RainChart, SmapChart, TmaxChart } from "@/components/ClimateCharts";
import { EmptyState } from "@/components/EmptyState";
import { Page } from "@/components/Page";
import { useLang } from "@/lib/i18n";
import { loadAdvice } from "@/lib/session-store";

export default function DataPage() {
  const { t, f, num } = useLang();
  const [payload, setPayload] = useState<ReturnType<typeof loadAdvice> | undefined>(undefined);

  useEffect(() => {
    setPayload(loadAdvice());
  }, []);

  if (payload === undefined) return <Page><div className="card empty" aria-busy="true" /></Page>;
  if (!payload?.context?.climate) {
    return (
      <Page>
        <EmptyState body={t.data.emptyBody} />
      </Page>
    );
  }

  const soil = payload.context.soil as {
    ph_median: number | null;
    om_pct: number | null;
    p_ppm_median: number | null;
    texture: string | null;
    land_type: string | null;
    drainage: string | null;
    source: string;
    source_url: string;
    sample_count: number;
  };
  const climate = payload.context.climate as {
    rabi_rain_normal_mm: number | null;
    monthly_rain_normal: { month: string; mm: number }[];
    monthly_tmax_normal: { month: string; c: number }[];
    smap_rootzone_rabi_m3m3: number | null;
    sources: string[];
  };
  const satellite = payload.context.satellite as {
    smap_monthly: { month: string; rootzone: number; surface: number }[];
    source: string;
    fallback?: boolean;
  };
  const place = payload.context.location
    ? `${payload.context.location.union}, ${payload.context.location.upazila}`
    : "";
  const rabi = (payload.advice as { rotation?: { seasons?: { rabi?: { crop: string } } } }).rotation?.seasons?.rabi?.crop;
  const na = (v: string | number | null | undefined) => (v == null || v === "" ? t.data.notAvailable : typeof v === "number" ? num(v) : v);

  return (
    <Page scene={rabi ? { pick: rabi } : undefined}>
      <div className="card page-head">
        <h1 style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)" }}>{t.data.title}</h1>
        <p className="lead">{f(t.data.lead, { place })}</p>
      </div>

      <div className="stack-lg">
        <section className="card stack" aria-labelledby="climate">
          <h2 id="climate">{t.data.climate}</h2>
          <div className="grid-2">
            <div>
              <p className="chart-caption">{t.data.rainChart}</p>
              <RainChart data={climate.monthly_rain_normal} label={t.data.rainChart} />
            </div>
            <div>
              <p className="chart-caption">{t.data.tmaxChart}</p>
              <TmaxChart data={climate.monthly_tmax_normal} label="Tmax °C" />
            </div>
          </div>
          <p className="small muted">
            {t.area.rainNormal} ({t.seasons.rabi}): <strong>{climate.rabi_rain_normal_mm != null ? `${num(Math.round(climate.rabi_rain_normal_mm))} mm` : "—"}</strong>
          </p>
        </section>

        <div className="grid-2">
          <section className="card stack" aria-labelledby="soil">
            <div className="card-title" style={{ marginBottom: 0 }}>
              <h2 id="soil">{t.data.soil}</h2>
              <span className="badge">{f(t.data.samples, { n: soil.sample_count })}</span>
            </div>
            <dl className="facts">
              <div><dt>{t.area.ph}</dt><dd>{na(soil.ph_median)}</dd></div>
              <div><dt>{t.area.om}</dt><dd>{soil.om_pct != null ? `${num(soil.om_pct)}%` : t.data.notAvailable}</dd></div>
              <div><dt>{t.area.p}</dt><dd>{soil.p_ppm_median != null ? `${num(soil.p_ppm_median)} ppm` : t.data.notAvailable}</dd></div>
              <div><dt>{t.area.texture}</dt><dd>{na(soil.texture)}</dd></div>
              <div><dt>{t.area.landType}</dt><dd>{na(soil.land_type)}</dd></div>
              <div><dt>{t.area.drainage}</dt><dd>{na(soil.drainage)}</dd></div>
            </dl>
            <a className="small" href={soil.source_url} target="_blank" rel="noreferrer">{soil.source}</a>
          </section>

          <section className="card stack" aria-labelledby="sat">
            <h2 id="sat">{t.data.satellite}</h2>
            {satellite.smap_monthly?.length > 0 ? (
              <div>
                <p className="chart-caption">{t.data.smapChart}</p>
                <SmapChart data={satellite.smap_monthly} rootLabel={t.data.rootzone} surfLabel={t.data.surface} />
              </div>
            ) : (
              <p className="muted">{t.data.notAvailable}</p>
            )}
            {satellite.fallback ? <p className="small muted">{t.area.nearest}</p> : null}
            <p className="small muted">{satellite.source}</p>
          </section>
        </div>

        {climate.sources?.length ? (
          <section className="card stack">
            <h3>{t.data.sources}</h3>
            <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
              {climate.sources.map((s) => (
                <li key={s}>{s.startsWith("http") ? <a href={s} target="_blank" rel="noreferrer">{s}</a> : s}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Page>
  );
}
