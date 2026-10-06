"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import en from "@/i18n/en.json";
import { saveAdvice } from "@/lib/session-store";

type UnionRow = {
  upazila: string;
  union: string;
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

export function FarmerForm() {
  const router = useRouter();
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
      .catch(() => setError("Could not load unions"));
  }, []);

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
    const body = {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Request failed");
      saveAdvice({ advice: data.advice, meta: data.meta, context: data.context, farmer: body });
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function toggleSell(item: string) {
    setCanSell((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card className="space-y-3">
        <label className="block text-sm font-medium text-[#333]">
          {en.form.upazila}
          <select
            className="mt-1 w-full rounded border border-stone-300 p-2 text-[#333]"
            value={upazila}
            onChange={(e) => setUpazila(e.target.value)}
          >
            <option value="Godagari">Godagari</option>
            <option value="Tanore">Tanore</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-[#333]">
          {en.form.union}
          <select
            className="mt-1 w-full rounded border border-stone-300 p-2 text-[#333]"
            value={union}
            onChange={(e) => setUnion(e.target.value)}
          >
            {unionOptions.map((u) => (
              <option key={u.union} value={u.union}>
                {u.union}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <Card className="space-y-3">
        <CropSelect label={en.form.lastRabi} value={lastRabi} onChange={setLastRabi} />
        <CropSelect label={en.form.lastK1} value={lastK1} onChange={setLastK1} />
        <CropSelect label={en.form.lastK2} value={lastK2} onChange={setLastK2} />
        <label className="block text-sm font-medium text-[#333]">
          {en.form.budget}
          <select
            className="mt-1 w-full rounded border border-stone-300 p-2 text-[#333]"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          >
            {(["low", "medium", "high"] as const).map((b) => (
              <option key={b} value={b}>
                {en.budget[b]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-[#333]">
          {en.form.water}
          <select
            className="mt-1 w-full rounded border border-stone-300 p-2 text-[#333]"
            value={water}
            onChange={(e) => setWater(e.target.value)}
          >
            {(["none", "limited", "reliable", "plenty"] as const).map((w) => (
              <option key={w} value={w}>
                {en.water[w]}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-medium text-[#333]">{en.form.canSell}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SELL.map((s) => (
              <label key={s} className="flex items-center gap-1 text-sm text-[#333]">
                <input
                  type="checkbox"
                  checked={canSell.includes(s)}
                  onChange={() => toggleSell(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </fieldset>
        <PrioritySlider
          label={en.form.priorityWater}
          value={priorities.water}
          onChange={(v) => setPriorities((p) => ({ ...p, water: v }))}
        />
        <PrioritySlider
          label={en.form.prioritySoil}
          value={priorities.soil}
          onChange={(v) => setPriorities((p) => ({ ...p, soil: v }))}
        />
        <PrioritySlider
          label={en.form.priorityProfit}
          value={priorities.profit}
          onChange={(v) => setPriorities((p) => ({ ...p, profit: v }))}
        />
      </Card>

      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? en.results.loading : en.form.submit}
      </Button>
    </form>
  );
}

function CropSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-[#333]">
      {label}
      <select
        className="mt-1 w-full rounded border border-stone-300 p-2 text-[#333]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {CROPS.map((c) => (
          <option key={c} value={c}>
            {c.replace(/_/g, " ")}
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
        className="mt-1 w-full"
      />
    </label>
  );
}
