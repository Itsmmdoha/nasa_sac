"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RainChart, SmapChart, TmaxChart } from "@/components/ClimateCharts";
import { useLocale } from "@/components/LocaleProvider";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui/card";
import { loadAdvice } from "@/lib/session-store";

export default function DataPage() {
  const { t } = useLocale();
  const [payload, setPayload] = useState<ReturnType<typeof loadAdvice>>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPayload(loadAdvice());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className="min-h-screen bg-[var(--surface-page)]">
        <Nav />
      </main>
    );
  }

  if (!payload?.context) {
    return (
      <main className="min-h-screen bg-[var(--surface-page)]">
        <Nav />
        <div className="mx-auto max-w-lg space-y-2 px-4 py-8 text-center text-[#333]">
          <p>{t.results.empty}</p>
          <Link href="/" className="text-[#14532d] underline">
            {t.nav.home}
          </Link>
        </div>
      </main>
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

  return (
    <main className="min-h-screen bg-[var(--surface-page)]">
      <Nav />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <h2 className="text-xl font-semibold text-[#14532d]">{t.data.title}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-2">
            <h3 className="font-medium text-[#14532d]">{t.data.climate}</h3>
            <p className="text-sm text-[#333]">
              {t.data.rabiRain}: {climate.rabi_rain_normal_mm ?? "—"} mm
            </p>
            <RainChart data={climate.monthly_rain_normal} name={t.data.chartRain} />
            <TmaxChart data={climate.monthly_tmax_normal} name={t.data.chartTmax} />
            <p className="text-xs text-[#333]">
              {t.data.source}: {climate.sources?.join(" · ")}
            </p>
          </Card>

          <Card className="space-y-2">
            <h3 className="font-medium text-[#14532d]">{t.data.soil}</h3>
            <ul className="space-y-1 text-sm">
              <li>
                {t.data.phMedian}: {soil.ph_median ?? "—"}
              </li>
              <li>
                {t.data.organicMatter}: {soil.om_pct ?? "—"}%
              </li>
              <li>
                {t.data.texture}: {soil.texture ?? "—"}
              </li>
              <li>
                {t.data.landType}: {soil.land_type ?? "—"}
              </li>
              <li>
                {t.data.samples}: {soil.sample_count}
              </li>
            </ul>
            <a
              href={soil.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs text-[#14532d] underline"
            >
              {t.data.source}: {soil.source}
            </a>
          </Card>

          <Card className="space-y-2 lg:col-span-2">
            <h3 className="font-medium text-[#14532d]">{t.data.satellite}</h3>
            {satellite.fallback && <p className="text-xs text-amber-800">{t.data.nearest}</p>}
            <p className="text-sm">
              {t.data.rabiMoisture}: {climate.smap_rootzone_rabi_m3m3 ?? "—"} m³/m³
            </p>
            {satellite.smap_monthly?.length > 0 && (
              <SmapChart
                data={satellite.smap_monthly}
                rootLabel={t.data.chartRoot}
                surfaceLabel={t.data.chartSurface}
              />
            )}
            <p className="text-xs text-[#333]">
              {t.data.source}: {satellite.source}
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
