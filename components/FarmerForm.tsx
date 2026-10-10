"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AdviceLang } from "@/lib/advice-copy";
import { saveAdvice } from "@/lib/session-store";
import { dictLabel } from "@/lib/text";

type UnionRow = {
  upazila: string;
  union: string;
  union_bn?: string;
  lat: number;
  lon: number;
};

const CROPS = [
  "boro",
  "t_aman",
  "wheat",
  "maize",
  "mustard",
  "lentil",
  "chickpea",
  "mungbean",
  "potato",
  "fallow",
];

const SELL = ["rice", "mustard", "lentil", "wheat", "maize", "pulse", "potato"];

const fieldClass =
  "mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white p-2.5 text-base text-[#333]";

export function FarmerForm() {
  const router = useRouter();
  const { t, lang } = useLocale();
  const [unions, setUnions] = useState<UnionRow[]>([]);
  const [upazila, setUpazila] = useState("Tanore");
  const [union, setUnion] = useState("Kalma");
  const [lastRabi, setLastRabi] = useState("boro");
  const [lastK1, setLastK1] = useState("fallow");
  const [lastK2, setLastK2] = useState("t_aman");
  const [budget, setBudget] = useState("medium");
  const [water, setWater] = useState("limited");
  const [canSell, setCanSell] = useState<string[]>(["rice", "mustard", "lentil"]);
  const [priorities, setPriorities] = useState({ profit: 3, soil: 4, water: 5 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/unions")
      .then((r) => r.json())
      .then((j) => setUnions(j.unions ?? []))
      .catch(() => setError(t.form.loadError));
  }, [t.form.loadError]);

  const unionOptions = useMemo(
    () => unions.filter((u) => u.upazila === upazila),
    [unions, upazila]
  );

  useEffect(() => {
    if (unionOptions.length && !unionOptions.find((u) => u.union === union)) {
      setUnion(unionOptions[0]!.union);
    }
  }, [unionOptions, union]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const farmer = {
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
        body: JSON.stringify({ ...farmer, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? t.form.requestFailed);
      const adviceLang: AdviceLang = data.meta?.advice_lang === "bn" ? "bn" : "en";
      saveAdvice({
        advice: data.advice,
        meta: data.meta,
        context: data.context,
        farmer,
        lang: adviceLang,
      });
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.form.failed);
    } finally {
      setLoading(false);
    }
  }

  function toggleSell(item: string) {
    setCanSell((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  function unionLabel(row: UnionRow) {
    if (lang === "bn") return dictLabel(t.places.union, row.union);
    return row.union;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card className="space-y-4">
        <label className="block text-sm font-medium text-[#333]">
          {t.form.upazila}
          <select
            className={fieldClass}
            value={upazila}
            onChange={(e) => setUpazila(e.target.value)}
          >
            <option value="Godagari">{dictLabel(t.places.upazila, "Godagari")}</option>
            <option value="Tanore">{dictLabel(t.places.upazila, "Tanore")}</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-[#333]">
          {t.form.union}
          <select
            className={fieldClass}
            value={union}
            onChange={(e) => setUnion(e.target.value)}
          >
            {unionOptions.map((u) => (
              <option key={u.union} value={u.union}>
                {unionLabel(u)}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <Card className="space-y-4">
        <CropSelect label={t.form.lastRabi} value={lastRabi} onChange={setLastRabi} crops={t.crops} />
        <CropSelect label={t.form.lastK1} value={lastK1} onChange={setLastK1} crops={t.crops} />
        <CropSelect label={t.form.lastK2} value={lastK2} onChange={setLastK2} crops={t.crops} />
        <label className="block text-sm font-medium text-[#333]">
          {t.form.budget}
          <select
            className={fieldClass}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          >
            {(["low", "medium", "high"] as const).map((b) => (
              <option key={b} value={b}>
                {t.budget[b]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-[#333]">
          {t.form.water}
          <select
            className={fieldClass}
            value={water}
            onChange={(e) => setWater(e.target.value)}
          >
            {(["none", "limited", "reliable", "plenty"] as const).map((w) => (
              <option key={w} value={w}>
                {t.water[w]}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-medium text-[#333]">{t.form.canSell}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SELL.map((s) => (
              <label
                key={s}
                className="flex min-h-11 items-center gap-2 rounded-lg border border-stone-200 px-3 text-sm text-[#333]"
              >
                <input
                  type="checkbox"
                  checked={canSell.includes(s)}
                  onChange={() => toggleSell(s)}
                />
                {dictLabel(t.sell, s)}
              </label>
            ))}
          </div>
        </fieldset>
        <PrioritySlider
          label={t.form.priorityWater}
          value={priorities.water}
          onChange={(v) => setPriorities((p) => ({ ...p, water: v }))}
        />
        <PrioritySlider
          label={t.form.prioritySoil}
          value={priorities.soil}
          onChange={(v) => setPriorities((p) => ({ ...p, soil: v }))}
        />
        <PrioritySlider
          label={t.form.priorityProfit}
          value={priorities.profit}
          onChange={(v) => setPriorities((p) => ({ ...p, profit: v }))}
        />
      </Card>

      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={loading} className="min-h-12 text-base">
        {loading ? t.results.loading : t.form.submit}
      </Button>
    </form>
  );
}

function CropSelect({
  label,
  value,
  onChange,
  crops,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  crops: Record<string, string>;
}) {
  return (
    <label className="block text-sm font-medium text-[#333]">
      {label}
      <select className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {CROPS.map((c) => (
          <option key={c} value={c}>
            {dictLabel(crops, c)}
          </option>
        ))}
      </select>
    </label>
  );
}

function PrioritySlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block text-sm font-medium text-[#333]">
      {label}: {value}
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="mt-2 h-8 w-full"
      />
    </label>
  );
}
