"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Page } from "@/components/Page";
import { RotationCard } from "@/components/RotationCard";
import { UnionMap } from "@/components/UnionMap";
import { YourAreaPanel } from "@/components/YourAreaPanel";
import en from "@/i18n/en.json";
import { loadAdvice } from "@/lib/session-store";
import type { ClimateSummary, SatelliteSummary, UnionSoilProfile } from "@/lib/types";

const REASON_LABEL: Record<string, string> = {
  MOCK_LLM: "MOCK_LLM=1 in environment",
  NO_GROQ_API_KEY: "No GROQ_API_KEY in .env.local",
  NO_OPENCODE_API_KEY: "No OPENCODE_API_KEY in .env.local",
  RATE_LIMIT: "Groq rate limit or server error",
  SCHEMA_ERROR: "Response did not match schema",
  GROQ_ERROR: "Groq request failed",
  JEV_ERROR: "System One request failed",
};

function cropName(id: string) {
  return id.replace(/_/g, " ");
}

export default function ResultsPage() {
  const [data, setData] = useState<ReturnType<typeof loadAdvice>>(null);

  useEffect(() => {
    setData(loadAdvice());
  }, []);

  if (!data) {
    return (
      <Page>
        <p>No results yet.</p>
        <p>
          <Link href="/">{en.nav.home}</Link>
        </p>
      </Page>
    );
  }

  const advice = data.advice as {
    summary: string;
    farm_name?: string;
    rotation: Parameters<typeof RotationCard>[0]["rotation"];
    location: { upazila: string; union: string };
    unsure?: boolean;
    deferred?: boolean;
    priority?: boolean;
    zone_note?: string;
    market_note?: string;
    decision_source?: string;
    zone?: { season: string; counts: { crop: string; n: number }[] };
  };
  const meta = data.meta as {
    source?: string;
    fallback_reason?: string;
    decision_fallback?: string;
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
  const decision =
    advice.decision_source === "jev" ? en.results.decisionJev : en.results.decisionScorer;
  const explain =
    meta.source === "groq" || meta.source === "cache"
      ? en.results.aiExplanation
      : meta.source === "mock"
        ? en.results.mockData
        : meta.source === "scorer"
          ? en.results.ruleBased
          : null;
  const why =
    meta.decision_fallback ||
    (meta.source !== "groq" && meta.source !== "cache" ? meta.fallback_reason : undefined);

  return (
    <Page place={loc?.union ?? advice.location.union}>
      {advice.farm_name ? <p className="farm-name">{advice.farm_name}</p> : null}
      {advice.rotation ? <h2 className="decision-name">{advice.rotation.name}</h2> : null}
      {advice.unsure ? <p className="unsure">{en.results.unsure}</p> : null}
      {advice.priority && !advice.deferred ? <p>{en.results.priority}</p> : null}
      {advice.zone_note ? <p>{advice.zone_note}</p> : null}

      {advice.zone && (
        <div className="stack">
          <h2>{en.results.zoneTitle}</h2>
          <p>{advice.zone.season}</p>
          <div className="zone-row">
            {advice.zone.counts.map((c) => (
              <p key={c.crop}>
                <span className="zone-n">{c.n}</span>
                <span className="zone-crop">{c.crop}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="stack">
        <h2>{en.results.marketTitle}</h2>
        <p>{advice.market_note}</p>
      </div>

      <p>
        {decision}
        {explain ? `. ${explain}` : ""}
        {why ? ` (${REASON_LABEL[why] ?? why})` : ""}
      </p>
      <p>{advice.summary}</p>

      {advice.rotation ? <RotationCard rotation={advice.rotation} /> : null}

      {ctx.soil && ctx.climate && ctx.satellite && loc && (
        <YourAreaPanel
          location={loc}
          soil={ctx.soil}
          climate={ctx.climate}
          satellite={ctx.satellite}
        />
      )}

      {loc && <UnionMap lat={loc.lat} lon={loc.lon} label={`${loc.union}, ${loc.upazila}`} />}

      <div>
        <h2>{en.results.current}</h2>
        <ul className="plain-list">
          <li>
            {en.seasons.rabi}: {cropName(farmer.last_crops.rabi)}
          </li>
          <li>
            {en.seasons.kharif1}: {cropName(farmer.last_crops.kharif1)}
          </li>
          <li>
            {en.seasons.kharif2}: {cropName(farmer.last_crops.kharif2)}
          </li>
        </ul>
      </div>

      <p>
        <Link href="/data">{en.nav.data}</Link>
      </p>
    </Page>
  );
}
