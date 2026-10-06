import { Card } from "@/components/ui/card";
import en from "@/i18n/en.json";
import { formatWaterChange } from "@/lib/formatWaterBadge";

type Rotation = {
  rank: number;
  rotation_id: string;
  name: string;
  seasons: Record<string, { crop: string; months: string }>;
  scores: Record<string, number>;
  water_use: { irrigation_mm: number; change_vs_current_pct: number; note: string };
  soil_health_effect: { direction: string; explanation: string };
  reasons: string[];
  risks: { risk: string; mitigation: string }[];
  confidence: { level: string; uncertainty_note: string };
};

const SCORE_KEYS = ["overall", "water", "soil_health", "profit", "climate_risk"] as const;

export function RotationCard({ rotation }: { rotation: Rotation }) {
  const waterLabel = formatWaterChange(rotation.water_use.change_vs_current_pct);

  return (
    <Card className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-[#333]">#{rotation.rank}</p>
          <h3 className="text-lg font-semibold text-[#14532d]">{rotation.name}</h3>
        </div>
        <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-xs text-[#333]">
          <p className="font-medium">{waterLabel}</p>
          <p>~{rotation.water_use.irrigation_mm} mm irrigation (rotation total)</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 text-center text-xs">
        {(["rabi", "kharif1", "kharif2"] as const).map((s) => (
          <div key={s} className="rounded bg-[#e7e5e4] p-2">
            <p className="font-medium text-[#333]">{en.seasons[s]}</p>
            <p className="capitalize text-[#333]">{rotation.seasons[s]?.crop.replace(/_/g, " ")}</p>
            <p className="text-[#333]">{rotation.seasons[s]?.months}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {SCORE_KEYS.map((k) => (
          <div key={k} className="flex items-center gap-2 text-sm text-[#333]">
            <span className="w-24 capitalize">{k.replace(/_/g, " ")}</span>
            <div className="h-2 flex-1 rounded bg-[#e7e5e4]">
              <div
                className="h-2 rounded bg-emerald-700"
                style={{ width: `${rotation.scores[k]}%` }}
              />
            </div>
            <span className="w-8 text-right font-medium">{rotation.scores[k]}</span>
          </div>
        ))}
      </div>
      {rotation.water_use.note && (
        <p className="text-sm text-[#333]">{rotation.water_use.note}</p>
      )}
      <p className="text-sm text-[#333]">
        Soil: {rotation.soil_health_effect.direction} — {rotation.soil_health_effect.explanation}
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-[#333]">
        {rotation.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {rotation.risks.length > 0 && (
        <div className="text-sm text-[#333]">
          {rotation.risks.map((r) => (
            <p key={r.risk}>
              <span className="font-medium">Risk:</span> {r.risk} ({r.mitigation})
            </p>
          ))}
        </div>
      )}
      <p
        className="rounded px-2 py-1 text-xs"
        style={{ background: "var(--confidence-bg)", color: "var(--confidence-text)" }}
      >
        Confidence: {rotation.confidence.level} — {rotation.confidence.uncertainty_note}
      </p>
    </Card>
  );
}
