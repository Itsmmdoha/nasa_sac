"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { Nav } from "@/components/Nav";
import { RotationCard } from "@/components/RotationCard";
import { UnionMap } from "@/components/UnionMap";
import { YourAreaPanel } from "@/components/YourAreaPanel";
import { Card } from "@/components/ui/card";
import { loadAdvice } from "@/lib/session-store";
import { dictLabel, fill } from "@/lib/text";
import type { ClimateSummary, SatelliteSummary, UnionSoilProfile } from "@/lib/types";

export default function ResultsPage() {
  const { t, lang } = useLocale();
  const [data, setData] = useState<ReturnType<typeof loadAdvice>>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(loadAdvice());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className="min-h-screen bg-[var(--surface-page)]">
        <Nav />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[var(--surface-page)]">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-8 text-center text-[#333]">
          <p>{t.results.empty}</p>
          <Link href="/" className="text-[#14532d] underline">
            {t.nav.home}
          </Link>
        </div>
      </main>
    );
  }

  const advice = data.advice as {
    summary: string;
    rotations: Parameters<typeof RotationCard>[0]["rotation"][];
    not_recommended: { rotation_id: string; why: string }[];
    location: { upazila: string; union: string };
  };
  const meta = data.meta as {
    source?: string;
    fallback_reason?: string;
    current_rotation_id?: string;
  };
  const ctx = data.context as {
    soil?: UnionSoilProfile;
    climate?: ClimateSummary;
    satellite?: SatelliteSummary;
    location?: { lat: number; lon: number; union: string; upazila: string };
  };
  const farmer = data.farmer as {
    last_crops: { rabi: string; kharif1: string; kharif2: string };
  };

  const loc = ctx.location;
  const adviceLang = data.lang ?? "en";
  const showMismatch = adviceLang !== lang;

  return (
    <main className="min-h-screen bg-[var(--surface-page)]">
      <Nav />
      <div className="mx-auto max-w-6xl px-4 py-6">
        {showMismatch && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {fill(t.results.langMismatch, {
              from: t.langName[adviceLang],
              to: t.langName[lang],
            })}
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          {ctx.soil && ctx.climate && ctx.satellite && loc && (
            <div className="lg:col-start-2 lg:row-start-1">
              <YourAreaPanel
                location={loc}
                soil={ctx.soil}
                climate={ctx.climate}
                satellite={ctx.satellite}
              />
            </div>
          )}

          <Card className="lg:col-start-1 lg:row-start-1">
            <SourceBadge source={meta.source} fallbackReason={meta.fallback_reason} />
            <p className="mt-2 text-base leading-relaxed text-[#333]">{advice.summary}</p>
          </Card>

          {loc && (
            <div className="lg:col-start-2 lg:row-start-2">
              <UnionMap
                lat={loc.lat}
                lon={loc.lon}
                label={`${dictLabel(t.places.union, loc.union)}, ${dictLabel(t.places.upazila, loc.upazila)}`}
              />
            </div>
          )}

          <div className="space-y-4 lg:col-start-1 lg:row-start-2">
            <h2 className="text-xl font-semibold text-[#14532d]">{t.results.title}</h2>
            {advice.rotations
              .slice()
              .sort((a, b) => a.rank - b.rank)
              .map((r) => (
                <RotationCard key={r.rotation_id} rotation={r} />
              ))}

            <Card>
              <h3 className="font-medium text-[#14532d]">{t.results.current}</h3>
              <p className="text-sm text-[#333]">
                {dictLabel(t.crops, farmer.last_crops.rabi)} ·{" "}
                {dictLabel(t.crops, farmer.last_crops.kharif1)} ·{" "}
                {dictLabel(t.crops, farmer.last_crops.kharif2)}
              </p>
            </Card>

            {advice.not_recommended?.length > 0 && (
              <Card>
                <h3 className="font-medium text-[#14532d]">{t.results.notRecommended}</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-[#333]">
                  {advice.not_recommended.map((n) => (
                    <li key={n.rotation_id}>
                      {n.rotation_id}: {n.why}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Link href="/data" className="block text-center text-sm text-[#14532d] underline">
              {t.nav.data}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function SourceBadge({
  source,
  fallbackReason,
}: {
  source?: string;
  fallbackReason?: string;
}) {
  const { t } = useLocale();
  const reason =
    fallbackReason && fallbackReason in t.results.reasons
      ? t.results.reasons[fallbackReason as keyof typeof t.results.reasons]
      : fallbackReason;

  if (source === "groq" || source === "cache") {
    return <span className="text-xs text-[#333]">{t.results.aiExplanation}</span>;
  }
  if (source === "mock") {
    return (
      <div className="text-xs text-[#333]">
        <span className="rounded bg-stone-200 px-1.5 py-0.5">{t.results.mockData}</span>
        {reason && <span className="ml-2">{reason}</span>}
      </div>
    );
  }
  if (source === "scorer") {
    return (
      <div className="text-xs text-[#333]">
        <span>{t.results.ruleBased}</span>
        {reason && <span className="ml-1">({reason})</span>}
      </div>
    );
  }
  return null;
}
