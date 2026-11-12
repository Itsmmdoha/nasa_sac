"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CROP_ICON, UPAZILA_BN, cropLabel, useLang } from "@/lib/i18n";
import { saveAdvice } from "@/lib/session-store";

type UnionRow = {
  upazila: string;
  union: string;
  union_bn?: string;
  is_paurashava_ward?: boolean;
  lat: number;
  lon: number;
};

const CROPS = ["boro", "t_aman", "wheat", "maize", "mustard", "lentil", "chickpea", "mungbean", "potato", "fallow"];
const SELL = ["rice", "mustard", "lentil", "wheat", "maize", "pulse", "potato"] as const;
const BUDGETS = ["low", "medium", "high"] as const;
const WATERS = ["none", "limited", "reliable", "plenty"] as const;

export function FarmerForm() {
  const router = useRouter();
  const { t, lang, num } = useLang();
  const [unions, setUnions] = useState<UnionRow[]>([]);
  const [farmName, setFarmName] = useState("");
  const [upazila, setUpazila] = useState("Godagari");
  const [union, setUnion] = useState("Godagari");
  const [lastRabi, setLastRabi] = useState("boro");
  const [lastK1, setLastK1] = useState("fallow");
  const [lastK2, setLastK2] = useState("t_aman");
  const [budget, setBudget] = useState<(typeof BUDGETS)[number]>("medium");
  const [water, setWater] = useState<(typeof WATERS)[number]>("limited");
  const [canSell, setCanSell] = useState<string[]>(["rice", "mustard", "lentil"]);
  const [priorities, setPriorities] = useState({ profit: 3, soil: 4, water: 5 });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [touched, setTouched] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/unions")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((j) => setUnions(j.unions ?? []))
      .catch(() => setLoadError(true));
  }, []);

  const options = useMemo(() => {
    const rows = unions.filter((u) => u.upazila === upazila);
    const label = (u: UnionRow) => (lang === "bn" && u.union_bn ? u.union_bn : u.union);
    const sort = (a: UnionRow, b: UnionRow) => a.union.localeCompare(b.union, "en", { numeric: true });
    return {
      unions: rows.filter((u) => !u.is_paurashava_ward && !u.union.startsWith("Ward")).sort(sort),
      wards: rows.filter((u) => u.is_paurashava_ward || u.union.startsWith("Ward")).sort(sort),
      label,
    };
  }, [unions, upazila, lang]);

  useEffect(() => {
    const all = [...options.unions, ...options.wards];
    if (all.length && !all.find((u) => u.union === union)) setUnion(options.unions[0]?.union ?? all[0]!.union);
  }, [options, union]);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, t.loading.steps.length - 1)), 900);
    return () => clearInterval(id);
  }, [loading, t.loading.steps.length]);

  const nameMissing = !farmName.trim();
  const sellMissing = canSell.length === 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameMissing) {
      nameRef.current?.focus();
      return;
    }
    if (sellMissing) return;
    setLoading(true);
    setError("");
    const body = {
      farm_name: farmName.trim(),
      upazila,
      union,
      last_crops: { rabi: lastRabi, kharif1: lastK1, kharif2: lastK2 },
      budget,
      water,
      can_sell: canSell,
      priorities,
    };
    try {
      const res = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t.form.requestFailed);
      saveAdvice({ advice: data.advice, meta: data.meta, context: data.context, farmer: body });
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t.form.requestFailed);
      setLoading(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <section className="form-section">
        <h3>
          <span className="num">{num(1)}</span>
          {t.form.sectionFarm}
        </h3>
        <label className="field">
          {t.form.farmName}
          <input
            ref={nameRef}
            type="text"
            name="farm_name"
            required
            maxLength={80}
            value={farmName}
            placeholder={t.form.farmNamePlaceholder}
            aria-invalid={touched && nameMissing}
            aria-describedby="farm-hint"
            onChange={(e) => setFarmName(e.target.value)}
          />
          <span id="farm-hint" className="hint">
            {touched && nameMissing ? <span style={{ color: "var(--gamcha)" }}>{t.form.needName} </span> : null}
            {t.form.farmNameHint}
          </span>
        </label>
        <div className="fields-2">
          <label className="field">
            {t.form.upazila}
            <select name="upazila" value={upazila} onChange={(e) => setUpazila(e.target.value)}>
              {["Godagari", "Tanore"].map((u) => (
                <option key={u} value={u}>
                  {lang === "bn" ? UPAZILA_BN[u] : u}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t.form.union}
            <select
              name="union"
              value={union}
              onChange={(e) => setUnion(e.target.value)}
              disabled={!unions.length}
            >
              {options.unions.length > 0 && (
                <optgroup label={t.form.unionsGroup}>
                  {options.unions.map((u) => (
                    <option key={u.union} value={u.union}>
                      {options.label(u)}
                    </option>
                  ))}
                </optgroup>
              )}
              {options.wards.length > 0 && (
                <optgroup label={t.form.wardsGroup}>
                  {options.wards.map((u) => (
                    <option key={u.union} value={u.union}>
                      {options.label(u)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
        </div>
        {loadError ? <p className="alert" role="alert">{t.form.loadError}</p> : null}
      </section>

      <section className="form-section">
        <h3>
          <span className="num">{num(2)}</span>
          {t.form.sectionHistory}
        </h3>
        <div className="fields-3">
          <CropSelect season="rabi" value={lastRabi} onChange={setLastRabi} />
          <CropSelect season="kharif1" value={lastK1} onChange={setLastK1} />
          <CropSelect season="kharif2" value={lastK2} onChange={setLastK2} />
        </div>
      </section>

      <section className="form-section">
        <h3>
          <span className="num">{num(3)}</span>
          {t.form.sectionSituation}
        </h3>
        <fieldset className="segmented" style={{ "--n": 4 } as React.CSSProperties}>
          <legend>{t.form.water}</legend>
          {WATERS.map((w) => (
            <label key={w}>
              <input type="radio" name="water" value={w} checked={water === w} onChange={() => setWater(w)} />
              {t.water[w]}
              <small>{t.waterHint[w]}</small>
            </label>
          ))}
        </fieldset>
        <fieldset className="segmented" style={{ "--n": 3 } as React.CSSProperties}>
          <legend>{t.form.budget}</legend>
          {BUDGETS.map((b) => (
            <label key={b}>
              <input type="radio" name="budget" value={b} checked={budget === b} onChange={() => setBudget(b)} />
              {t.budget[b]}
            </label>
          ))}
        </fieldset>
      </section>

      <section className="form-section">
        <h3>
          <span className="num">{num(4)}</span>
          {t.form.sectionSell}
        </h3>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }} aria-describedby="sell-hint">
          <legend className="sr-only">{t.form.sectionSell}</legend>
          <div className="chips">
            {SELL.map((s) => (
              <label key={s} className="chip">
                <input
                  type="checkbox"
                  name="can_sell"
                  value={s}
                  checked={canSell.includes(s)}
                  onChange={() =>
                    setCanSell((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
                  }
                />
                <img src={CROP_ICON[s]} alt="" width={30} height={30} />
                {t.sell[s]}
              </label>
            ))}
          </div>
          <p id="sell-hint" className="small" style={{ marginTop: 8, color: touched && sellMissing ? "var(--gamcha)" : "var(--muted)" }}>
            {touched && sellMissing ? t.form.needSell : t.form.canSell}
          </p>
        </fieldset>
      </section>

      <section className="form-section">
        <h3>
          <span className="num">{num(5)}</span>
          {t.form.sectionPriorities}
        </h3>
        {(
          [
            ["water", t.form.priorityWater],
            ["soil", t.form.prioritySoil],
            ["profit", t.form.priorityProfit],
          ] as const
        ).map(([key, label]) => {
          const v = priorities[key];
          return (
            <div className="priority" key={key}>
              <label htmlFor={`p-${key}`} className="field" style={{ margin: 0 }}>
                {label}
              </label>
              <input
                id={`p-${key}`}
                type="range"
                min={1}
                max={5}
                step={1}
                value={v}
                aria-valuetext={t.form.priorityScale[v - 1]}
                style={{ "--p": `${((v - 1) / 4) * 100}%` } as React.CSSProperties}
                onChange={(e) => setPriorities((p) => ({ ...p, [key]: parseInt(e.target.value, 10) }))}
              />
              <output htmlFor={`p-${key}`}>{t.form.priorityScale[v - 1]}</output>
            </div>
          );
        })}
      </section>

      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary btn-block" disabled={loading || !unions.length}>
        {t.form.submit}
        <span aria-hidden>→</span>
      </button>

      {loading ? (
        <div className="loading" role="status" aria-live="polite">
          <div className="loading-card">
            <img src="/crops/seedling.webp" alt="" />
            <h2>{t.loading.title}</h2>
            <ol className="loading-steps">
              {t.loading.steps.map((s, i) => (
                <li key={s} data-state={i < step ? "done" : i === step ? "active" : "todo"}>
                  <span className="tick" aria-hidden>{i < step ? "✓" : ""}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function CropSelect({
  season,
  value,
  onChange,
}: {
  season: "rabi" | "kharif1" | "kharif2";
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useLang();
  return (
    <label className="field">
      <span className="season-tag">
        {t.seasons[season]} <small>{t.months[season]}</small>
      </span>
      <select name={`last_${season}`} value={value} onChange={(e) => onChange(e.target.value)}>
        {CROPS.map((c) => (
          <option key={c} value={c}>
            {cropLabel(t, c)}
          </option>
        ))}
      </select>
    </label>
  );
}
