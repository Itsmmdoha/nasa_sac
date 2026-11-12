"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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

export function FarmerForm({ onPlaceChange }: { onPlaceChange?: (place: string) => void }) {
  const router = useRouter();
  const [unions, setUnions] = useState<UnionRow[]>([]);
  const [farmName, setFarmName] = useState("");
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

  useEffect(() => {
    onPlaceChange?.(union);
  }, [union, onPlaceChange]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      const data = await res.json();
      if (!res.ok) {
        const err = data.error;
        const message =
          typeof err === "string"
            ? err
            : "Request failed";
        throw new Error(message);
      }
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
    <form onSubmit={onSubmit}>
      <label className="field">
        {en.form.farmName}
        <input
          required
          maxLength={80}
          value={farmName}
          onChange={(e) => setFarmName(e.target.value)}
        />
      </label>
      <label className="field">
        {en.form.upazila}
        <select value={upazila} onChange={(e) => setUpazila(e.target.value)}>
          <option value="Godagari">Godagari</option>
          <option value="Tanore">Tanore</option>
        </select>
      </label>
      <label className="field">
        {en.form.union}
        <select value={union} onChange={(e) => setUnion(e.target.value)}>
          {unionOptions.map((u) => (
            <option key={u.union} value={u.union}>
              {u.union}
            </option>
          ))}
        </select>
      </label>

      <CropSelect label={en.form.lastRabi} value={lastRabi} onChange={setLastRabi} />
      <CropSelect label={en.form.lastK1} value={lastK1} onChange={setLastK1} />
      <CropSelect label={en.form.lastK2} value={lastK2} onChange={setLastK2} />
      <label className="field">
        {en.form.budget}
        <select value={budget} onChange={(e) => setBudget(e.target.value)}>
          {(["low", "medium", "high"] as const).map((b) => (
            <option key={b} value={b}>
              {en.budget[b]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {en.form.water}
        <select value={water} onChange={(e) => setWater(e.target.value)}>
          {(["none", "limited", "reliable", "plenty"] as const).map((w) => (
            <option key={w} value={w}>
              {en.water[w]}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="field">
        <legend>{en.form.canSell}</legend>
        <div className="checks">
          {SELL.map((s) => (
            <label key={s}>
              <input
                type="checkbox"
                checked={canSell.includes(s)}
                onChange={() => toggleSell(s)}
              />{" "}
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

      {error && <p>{error}</p>}
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
    <label className="field">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
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
    <label className="field">
      {label}: {value}
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
      />
    </label>
  );
}
