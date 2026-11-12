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
    <div className="stack">
      {rotation.rank > 0 ? <h3 className="decision-name">{rotation.name}</h3> : null}
      <p>
        {waterLabel}. About {rotation.water_use.irrigation_mm} mm irrigation for the rotation.
      </p>
      <div className="seasons">
        {(["rabi", "kharif1", "kharif2"] as const).map((s) => (
          <p key={s}>
            {en.seasons[s]}: {rotation.seasons[s]?.crop.replace(/_/g, " ")}
          </p>
        ))}
      </div>
      <dl className="score-list">
        {SCORE_KEYS.map((k) => (
          <div key={k}>
            <dt className="capitalize">{k.replace(/_/g, " ")}</dt>
            <dd>{rotation.scores[k]}</dd>
          </div>
        ))}
      </dl>
      {rotation.water_use.note ? <p>{rotation.water_use.note}</p> : null}
      <p>
        Soil {rotation.soil_health_effect.direction}. {rotation.soil_health_effect.explanation}
      </p>
      <ul className="plain-list">
        {rotation.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {rotation.risks.length > 0 &&
        rotation.risks.map((r) => (
          <p key={r.risk}>
            {r.risk} {r.mitigation}
          </p>
        ))}
      <p>
        {rotation.confidence.level.charAt(0).toUpperCase() + rotation.confidence.level.slice(1)}.{" "}
        {rotation.confidence.uncertainty_note}
      </p>
    </div>
  );
}
