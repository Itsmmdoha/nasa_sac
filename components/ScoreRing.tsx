"use client";

import { useEffect, useState } from "react";

export function ScoreRing({ value, label, display }: { value: number; label: string; display: string }) {
  const r = 86;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const color = value >= 70 ? "var(--leaf)" : value >= 50 ? "var(--mustard)" : "var(--clay)";
  return (
    <div className="score-ring" role="img" aria-label={`${label}: ${value} / 100`}>
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        <circle cx="100" cy="100" r={r} fill="none" stroke="#f0e3cc" strokeWidth="16" />
        <circle
          className="val"
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
        />
      </svg>
      <div className="ring-val">
        <div>
          <strong>{display}</strong>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}
