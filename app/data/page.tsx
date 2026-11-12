"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RainChart, SmapChart, TmaxChart } from "@/components/ClimateCharts";
import { Page } from "@/components/Page";
import en from "@/i18n/en.json";
import { loadAdvice } from "@/lib/session-store";

export default function DataPage() {
  const [payload, setPayload] = useState<ReturnType<typeof loadAdvice>>(null);

  useEffect(() => {
    setPayload(loadAdvice());
  }, []);

  if (!payload?.context) {
    return (
      <Page>
        <p>
          <Link href="/">{en.nav.home}</Link>
        </p>
      </Page>
    );
  }

  const soil = payload.context.soil as {
    ph_median: number | null;
    om_pct: number | null;
    texture: string | null;
    land_type: string | null;
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
    ndvi_series: { date: string; ndvi: number }[];
    source: string;
    fallback?: boolean;
  };
  const place = payload.context.location?.union;

  return (
    <Page place={place}>
      <h2>{en.data.title}</h2>

      <div className="stack">
        <h3>{en.data.climate}</h3>
        <p>Normal Rabi rain: {climate.rabi_rain_normal_mm ?? "—"} mm</p>
        <RainChart data={climate.monthly_rain_normal} />
        <TmaxChart data={climate.monthly_tmax_normal} />
        {climate.sources?.length ? (
          <ul className="plain-list">
            {climate.sources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="stack">
        <h3>{en.data.soil}</h3>
        <ul className="plain-list">
          <li>pH (median): {soil.ph_median ?? "—"}</li>
          <li>Organic matter: {soil.om_pct ?? "—"}%</li>
          <li>Texture: {soil.texture ?? "—"}</li>
          <li>Land type: {soil.land_type ?? "—"}</li>
          <li>Samples: {soil.sample_count}</li>
        </ul>
        <a href={soil.source_url} target="_blank" rel="noreferrer">
          {soil.source}
        </a>
      </div>

      <div className="stack">
        <h3>{en.data.satellite}</h3>
        {satellite.fallback && <p>Using nearest cached NASA point for this union.</p>}
        <p>Rabi mean root-zone moisture: {climate.smap_rootzone_rabi_m3m3 ?? "—"} m³/m³</p>
        {satellite.smap_monthly?.length > 0 && <SmapChart data={satellite.smap_monthly} />}
        <p>{satellite.source}</p>
      </div>
    </Page>
  );
}
