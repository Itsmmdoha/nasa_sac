"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RainChart, SmapChart, TmaxChart } from "@/components/ClimateCharts";
import { Nav } from "@/components/Nav";
import { Card } from "@/components/ui/card";
import en from "@/i18n/en.json";
import { loadAdvice } from "@/lib/session-store";

export default function DataPage() {
  const [payload, setPayload] = useState<ReturnType<typeof loadAdvice>>(null);

  useEffect(() => {
    setPayload(loadAdvice());
  }, []);

  if (!payload?.context) {
    return (
      <main className="min-h-screen bg-[#f5f5f4]">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-8 text-center">
          <Link href="/" className="text-[#14532d] underline">
            {en.nav.home}
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
    <main className="min-h-screen bg-stone-100">
      <Nav />
      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <h2 className="text-lg font-semibold">{en.data.title}</h2>

        <Card>
          <h3 className="font-medium">{en.data.climate}</h3>
          <p className="text-sm text-[#333]">
            Normal Rabi rain: {climate.rabi_rain_normal_mm ?? "—"} mm
          </p>
          <RainChart data={climate.monthly_rain_normal} />
          <TmaxChart data={climate.monthly_tmax_normal} />
          <p className="mt-2 text-xs text-[#333]">{climate.sources?.join(" · ")}</p>
        </Card>

        <Card>
          <h3 className="font-medium">{en.data.soil}</h3>
          <ul className="mt-2 space-y-1 text-sm">
            <li>pH (median): {soil.ph_median ?? "—"}</li>
            <li>Organic matter: {soil.om_pct ?? "—"}%</li>
            <li>Texture: {soil.texture ?? "—"}</li>
            <li>Land type: {soil.land_type ?? "—"}</li>
            <li>Samples: {soil.sample_count}</li>
          </ul>
          <a
            href={soil.source_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs text-[#14532d] underline"
          >
            {soil.source}
          </a>
        </Card>

        <Card>
          <h3 className="font-medium">{en.data.satellite}</h3>
          {satellite.fallback && (
            <p className="text-xs text-amber-800">Using nearest cached NASA point for this union.</p>
          )}
          <p className="text-sm">
            Rabi mean root-zone moisture: {climate.smap_rootzone_rabi_m3m3 ?? "—"} m³/m³
          </p>
          {satellite.smap_monthly?.length > 0 && <SmapChart data={satellite.smap_monthly} />}
          <p className="mt-2 text-xs text-[#333]">{satellite.source}</p>
        </Card>
      </div>
    </main>
  );
}
