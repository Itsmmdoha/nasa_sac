"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { RotationCard } from "@/components/RotationCard";
import { UnionMap } from "@/components/UnionMap";
import { YourAreaPanel } from "@/components/YourAreaPanel";
import { Card } from "@/components/ui/card";
import en from "@/i18n/en.json";
import { loadAdvice } from "@/lib/session-store";
import type { ClimateSummary, SatelliteSummary, UnionSoilProfile } from "@/lib/types";

const REASON_LABEL: Record<string, string> = {
  MOCK_LLM: "MOCK_LLM=1 in environment",
  NO_GROQ_API_KEY: "No GROQ_API_KEY in .env.local",
  RATE_LIMIT: "Groq rate limit or server error",
  SCHEMA_ERROR: "Response did not match schema",
  GROQ_ERROR: "Groq request failed",
};

function SourceBadge({
  source,
  fallbackReason,
}: {
  source?: string;
  fallbackReason?: string;
}) {
  if (source === "groq" || source === "cache") {
    return (
      <span className="text-xs text-[#333]">{en.results.aiExplanation}</span>
    );
  }
  if (source === "mock") {
    return (
      <div className="text-xs text-[#333]">
        <span className="rounded bg-stone-200 px-1.5 py-0.5">{en.results.mockData}</span>
        {fallbackReason && (
          <span className="ml-2">{REASON_LABEL[fallbackReason] ?? fallbackReason}</span>
        )}
      </div>
    );
  }
  if (source === "scorer") {
    return (
      <div className="text-xs text-[#333]">
        <span>{en.results.ruleBased}</span>
        {fallbackReason && (
          <span className="ml-1">({REASON_LABEL[fallbackReason] ?? fallbackReason})</span>
        )}
      </div>
    );
  }
  return null;
}

export default function ResultsPage() {
  const [data, setData] = useState<ReturnType<typeof loadAdvice>>(null);

  useEffect(() => {
    setData(loadAdvice());
  }, []);

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f5f5f4]">
        <Nav />
        <div className="mx-auto max-w-lg px-4 py-8 text-center text-[#333]">
          <p>No results yet.</p>
          <Link href="/" className="text-[#14532d] underline">
            {en.nav.home}
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

  return (
    <main className="min-h-screen bg-[#f5f5f4]">
      <Nav />
      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        {ctx.soil && ctx.climate && ctx.satellite && loc && (
          <YourAreaPanel
            location={loc}
            soil={ctx.soil}
            climate={ctx.climate}
            satellite={ctx.satellite}
          />
        )}

        <Card>
          <SourceBadge source={meta.source} fallbackReason={meta.fallback_reason} />
          <p className="mt-2 text-base text-[#333]">{advice.summary}</p>
        </Card>

        {loc && (
          <UnionMap lat={loc.lat} lon={loc.lon} label={`${loc.union}, ${loc.upazila}`} />
        )}

        <h2 className="text-lg font-semibold text-[#14532d]">{en.results.title}</h2>
        {advice.rotations
          .slice()
          .sort((a, b) => a.rank - b.rank)
          .map((r) => (
            <RotationCard key={r.rotation_id} rotation={r} />
          ))}

        <Card>
          <h3 className="font-medium text-[#14532d]">{en.results.current}</h3>
          <p className="text-sm capitalize text-[#333]">
            {farmer.last_crops.rabi.replace(/_/g, " ")} ·{" "}
            {farmer.last_crops.kharif1.replace(/_/g, " ")} ·{" "}
            {farmer.last_crops.kharif2.replace(/_/g, " ")}
          </p>
        </Card>

        {advice.not_recommended?.length > 0 && (
          <Card>
            <h3 className="font-medium text-[#14532d]">{en.results.notRecommended}</h3>
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
          {en.nav.data}
        </Link>
      </div>
    </main>
  );
}
