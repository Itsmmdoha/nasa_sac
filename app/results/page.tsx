"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { Page } from "@/components/Page";
import { ScoreRing } from "@/components/ScoreRing";
import { UnionMap } from "@/components/UnionMap";
import { YourAreaPanel } from "@/components/YourAreaPanel";
import { CROP_ICON, UPAZILA_BN, cropLabel, useLang } from "@/lib/i18n";
import { loadAdvice } from "@/lib/session-store";
import type { ClimateSummary, SatelliteSummary, UnionSoilProfile } from "@/lib/types";

type SeasonKey = "rabi" | "kharif1" | "kharif2";
const SEASONS: SeasonKey[] = ["rabi", "kharif1", "kharif2"];
const SCORE_KEYS = ["water", "soil_health", "profit", "climate_risk"] as const;
const SCORE_COLOR: Record<string, string> = {
  water: "var(--water)",
  soil_health: "var(--leaf-2)",
  profit: "var(--mustard)",
  climate_risk: "var(--clay)",
};
const ZONE_COLOR: Record<string, string> = {
  mustard: "#d9a514",
  lentil: "#3d8b4f",
  maize: "#7a8f2f",
  other: "#b08b67",
};

type Rotation = {
  rotation_id: string;
  name: string;
  seasons: Record<SeasonKey, { crop: string; months: string }>;
  scores: Record<string, number>;
  water_use: { irrigation_mm: number; change_vs_current_pct: number; note: string };
  soil_health_effect: { direction: "improves" | "neutral" | "degrades"; explanation: string };
  reasons: string[];
  risks: { risk: string; mitigation: string }[];
  confidence: { level: "low" | "medium" | "high"; uncertainty_note: string };
};

type Advice = {
  summary: string;
  farm_name?: string;
  rotation: Rotation;
  location: { upazila: string; union: string };
  unsure?: boolean;
  confidence?: number | null;
  deferred?: boolean;
  priority?: boolean;
  zone_note?: string;
  market_note?: string;
  market_source?: "jev" | "keywords" | "none";
  market?: { crop: string; noul: number; glut: boolean }[];
  decision_source?: string;
  individual_best_name?: string;
  zone?: { upazila: string; season: string; counts: { crop: string; n: number }[] };
  alternatives?: {
    rotation_id: string;
    name: string;
    name_bn: string;
    rabi_crop: string;
    overall: number;
  }[];
  bn?: {
    rotation_name: string;
    individual_best_name: string;
    zone_note: string;
    market_note: string;
    summary?: string;
    reasons?: string[];
    risks?: { risk: string; mitigation: string }[];
    soil_explanation?: string;
    water_note?: string;
    uncertainty_note?: string;
  };
};

type Meta = { source?: string; decision_source?: string; store?: "postgres" | "local" };

export default function ResultsPage() {
  const { t, f, num, lang } = useLang();
  const [data, setData] = useState<ReturnType<typeof loadAdvice> | undefined>(undefined);

  useEffect(() => {
    setData(loadAdvice());
  }, []);

  if (data === undefined) {
    return (
      <Page>
        <div className="card empty" aria-busy="true" />
      </Page>
    );
  }
  if (!data) {
    return (
      <Page>
        <EmptyState />
      </Page>
    );
  }

  const advice = data.advice as Advice;
  const meta = data.meta as Meta;
  const ctx = data.context as {
    soil?: UnionSoilProfile;
    climate?: ClimateSummary;
    satellite?: SatelliteSummary;
    location?: { lat: number; lon: number; union: string; upazila: string };
  };
  const farmer = data.farmer as {
    water: string;
    last_crops: Record<SeasonKey, string>;
  };
  const rot = advice.rotation;
  const bn = lang === "bn" ? advice.bn : undefined;
  const loc = ctx.location;
  const upazilaName = lang === "bn" ? (UPAZILA_BN[advice.location.upazila] ?? advice.location.upazila) : advice.location.upazila;

  const rotationName = bn?.rotation_name ?? rot.name;
  const summary = bn?.summary ?? advice.summary;
  const reasons = bn?.reasons?.length ? bn.reasons : rot.reasons;
  const risks = bn?.risks ?? rot.risks;
  const zoneNote = bn ? bn.zone_note : advice.zone_note;
  const marketNote = bn ? bn.market_note : advice.market_note;
  const soilText = bn?.soil_explanation ?? rot.soil_health_effect.explanation;
  const waterNote = bn?.water_note ?? rot.water_use.note;
  const uncertainty = bn?.uncertainty_note ?? rot.confidence.uncertainty_note;

  const change = rot.water_use.change_vs_current_pct;
  const waterChange =
    change === 0 ? t.results.waterSame : change < 0 ? f(t.results.waterLess, { n: Math.abs(change) }) : f(t.results.waterMore, { n: change });
  const rabi = rot.seasons.rabi.crop;
  const dry = farmer.water === "none" || farmer.water === "limited";
  const totalFarms = advice.zone?.counts.reduce((s, c) => s + c.n, 0) ?? 0;
  const youBucket = ["mustard", "lentil", "maize"].includes(rabi) ? rabi : "other";

  return (
    <Page scene={{ pick: rabi, dry }}>
      <section className="card result-hero" aria-labelledby="rot-title">
        <div>
          <p className="eyebrow">
            {t.results.eyebrow} {advice.farm_name ? <strong style={{ color: "var(--ink)" }}>{advice.farm_name}</strong> : null}
            {" · "}
            {loc?.union ?? advice.location.union}, {upazilaName} · {t.results.season}
          </p>
          <h1 id="rot-title">{rotationName}</h1>
          <div className="badges">
            <span className={advice.decision_source === "jev" ? "badge green" : "badge"}>
              {advice.decision_source === "jev" ? t.results.decisionJev : t.results.decisionScorer}
            </span>
            <span className={rot.confidence.level === "high" ? "badge green" : rot.confidence.level === "low" ? "badge red" : "badge gold"}>
              {t.confidence[rot.confidence.level]}
              {advice.confidence != null ? ` · ${num(Math.round(advice.confidence * 100))}%` : ""}
            </span>
            <span className="badge blue">
              {meta.source === "groq" || meta.source === "cache" ? t.results.explainLive : t.results.explainTemplate}
            </span>
          </div>
          <div className="timeline" role="list">
            {SEASONS.map((s) => {
              const crop = rot.seasons[s].crop;
              const changed = farmer.last_crops?.[s] !== crop;
              return (
                <div key={s} role="listitem" className={changed ? "changed" : ""}>
                  <img src={CROP_ICON[crop] ?? CROP_ICON.other} alt="" />
                  <div>
                    <span className="season">
                      {t.seasons[s]} · {t.months[s]}
                    </span>
                    <strong>{cropLabel(t, crop)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <ScoreRing value={rot.scores.overall} display={num(rot.scores.overall)} label={t.scores.overall} />
      </section>

      <div className="stack-lg" style={{ marginTop: 28 }}>
        {advice.unsure ? <p className="note" role="note">{t.results.unsure}</p> : null}
        {advice.priority && !advice.deferred ? <p className="note info">{t.results.priority}</p> : null}

        <div className="grid-2">
          <section className="card stack" aria-labelledby="why">
            <h2 id="why">{t.results.whyTitle}</h2>
            <p className="measure">{summary}</p>
            <ul className="reasons">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {risks.length > 0 ? (
              <div className="stack" style={{ marginTop: 6 }}>
                <h3>{t.results.risksTitle}</h3>
                {risks.map((r) => (
                  <div key={r.risk} className="risk">
                    <strong>{r.risk}</strong>
                    {r.mitigation}
                  </div>
                ))}
              </div>
            ) : null}
            {uncertainty ? <p className="small muted">{uncertainty}</p> : null}
          </section>

          <div className="stack-lg">
            <section className="card" aria-labelledby="scores">
              <h2 id="scores" style={{ marginBottom: 16 }}>{t.results.scoresTitle}</h2>
              <div className="bars">
                {SCORE_KEYS.map((k) => (
                  <div className="bar-row" key={k}>
                    <span className="label">{t.scores[k]}</span>
                    <div className="bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rot.scores[k]} aria-label={t.scores[k]}>
                      <span style={{ "--w": `${rot.scores[k]}%`, "--c": SCORE_COLOR[k] } as React.CSSProperties} />
                    </div>
                    <span className="val">{num(rot.scores[k])}</span>
                  </div>
                ))}
              </div>
            </section>
            <div className="grid-2">
              <section className="card stack">
                <h3>{t.results.waterTitle}</h3>
                <div className="stat">
                  <strong style={{ color: change <= 0 ? "var(--leaf)" : "var(--gamcha)" }}>
                    {change === 0 ? "=" : `${change < 0 ? "−" : "+"}${num(Math.abs(change))}%`}
                  </strong>
                  <span>{waterChange}</span>
                </div>
                <p className="small muted">{f(t.results.waterMm, { n: rot.water_use.irrigation_mm })}</p>
                {waterNote ? <p className="small">{waterNote}</p> : null}
              </section>
              <section className="card stack">
                <h3>{t.results.soilTitle}</h3>
                <span className={rot.soil_health_effect.direction === "improves" ? "badge green" : rot.soil_health_effect.direction === "degrades" ? "badge red" : "badge"} style={{ alignSelf: "flex-start" }}>
                  {t.direction[rot.soil_health_effect.direction]}
                </span>
                <p className="small">{soilText}</p>
              </section>
            </div>
          </div>
        </div>

        {advice.zone ? (
          <section className="card stack" aria-labelledby="zone">
            <div className="card-title" style={{ marginBottom: 0 }}>
              <h2 id="zone">{f(t.results.zoneTitle, { upazila: upazilaName })}</h2>
              <span className="muted small">{f(t.results.zoneFarms, { n: totalFarms })}</span>
            </div>
            <p className="muted">{t.results.zoneLead}</p>
            <div className="zone-bar" aria-hidden>
              {advice.zone.counts
                .filter((c) => c.n > 0)
                .map((c) => (
                  <div key={c.crop} style={{ flexGrow: c.n, background: ZONE_COLOR[c.crop] }}>
                    {num(c.n)}
                  </div>
                ))}
            </div>
            <div className="zone-legend">
              {advice.zone.counts.map((c) => (
                <div key={c.crop} className={c.crop === youBucket ? "you" : ""}>
                  <img src={CROP_ICON[c.crop] ?? CROP_ICON.other} alt="" />
                  <div>
                    <strong>{num(c.n)}</strong>
                    <span>
                      {cropLabel(t, c.crop)}
                      {c.crop === youBucket ? ` · ${t.results.zoneYou}` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {zoneNote ? <p className="note info">{zoneNote}</p> : null}
            {advice.deferred && advice.individual_best_name ? (
              <p className="small muted">{f(t.results.zoneBest, { name: bn?.individual_best_name ?? advice.individual_best_name })}</p>
            ) : null}
            <p className="small muted">{meta.store === "postgres" ? t.results.storePg : t.results.storeLocal}</p>
          </section>
        ) : null}

        <div className="grid-2">
          <section className="card stack" aria-labelledby="market">
            <div className="card-title" style={{ marginBottom: 0 }}>
              <h2 id="market">{t.results.marketTitle}</h2>
              <span className="muted small">
                {advice.market_source === "jev" ? t.results.marketJev : advice.market_source === "keywords" ? t.results.marketKeywords : t.results.marketNone}
              </span>
            </div>
            {advice.market?.length ? (
              <ul className="market-list">
                {advice.market.map((m) => (
                  <li key={m.crop} className={m.glut ? "glut" : ""}>
                    <img src={CROP_ICON[m.crop] ?? CROP_ICON.other} alt="" />
                    <div>
                      <span className="m-name">{cropLabel(t, m.crop)}</span>
                      <span className="m-state">{m.glut ? t.results.glut : t.results.noGlut}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            <p>{marketNote}</p>
          </section>

          <section className="card stack" aria-labelledby="compare">
            <h2 id="compare">{t.results.compareTitle}</h2>
            <div className="compare">
              <div className="col">
                <h3>{t.results.now}</h3>
                {SEASONS.map((s) => (
                  <div className="crop-line" key={s}>
                    <img src={CROP_ICON[farmer.last_crops[s]] ?? CROP_ICON.other} alt="" />
                    <div>
                      <small>{t.seasons[s]}</small>
                      {cropLabel(t, farmer.last_crops[s])}
                    </div>
                  </div>
                ))}
              </div>
              <span className="arrow" aria-hidden>→</span>
              <div className="col">
                <h3>{t.results.next}</h3>
                {SEASONS.map((s) => (
                  <div className="crop-line" key={s}>
                    <img src={CROP_ICON[rot.seasons[s].crop] ?? CROP_ICON.other} alt="" />
                    <div>
                      <small>{t.seasons[s]}</small>
                      <strong>{cropLabel(t, rot.seasons[s].crop)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {advice.alternatives?.length ? (
          <section className="card stack" aria-labelledby="alts">
            <h2 id="alts">{t.results.altTitle}</h2>
            <ul className="alt-list">
              {advice.alternatives.map((a) => (
                <li key={a.rotation_id}>
                  <img src={CROP_ICON[a.rabi_crop] ?? CROP_ICON.other} alt="" />
                  <span>{lang === "bn" ? a.name_bn : a.name}</span>
                  <div className="bar">
                    <span style={{ "--w": `${a.overall}%`, "--c": "var(--crust)" } as React.CSSProperties} />
                  </div>
                  <strong style={{ textAlign: "right" }}>{num(a.overall)}</strong>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {ctx.soil && ctx.climate && ctx.satellite ? (
          <section className="stack" aria-labelledby="area">
            <h2 id="area">{t.results.areaTitle}</h2>
            <YourAreaPanel soil={ctx.soil} climate={ctx.climate} satellite={ctx.satellite} />
          </section>
        ) : null}

        {loc ? (
          <section className="card stack" aria-labelledby="map">
            <h2 id="map">{t.results.mapTitle}</h2>
            <UnionMap lat={loc.lat} lon={loc.lon} label={`${loc.union}, ${loc.upazila}`} />
          </section>
        ) : null}

        <div className="row no-print">
          <Link href="/" className="btn btn-primary">{t.results.newAdvice}</Link>
          <Link href="/data" className="btn btn-ghost">{t.results.seeData}</Link>
        </div>
      </div>
    </Page>
  );
}
