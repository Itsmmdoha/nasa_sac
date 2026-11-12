"use client";

/* eslint-disable @next/next/no-img-element */

export type SceneState = {
  /** Rabi crop of the chosen rotation. */
  pick?: string;
  /** Water is scarce: maize droops and the bucket drops into the well. */
  dry?: boolean;
};

const SHOWN = ["mustard", "lentil", "maize"] as const;

export function FieldScene({ state }: { state?: SceneState }) {
  const pick = state?.pick;
  const hasPick = Boolean(pick);
  const other = hasPick && !SHOWN.includes(pick as (typeof SHOWN)[number]);
  return (
    <div
      className={["scene", hasPick ? "has-pick" : "", state?.dry ? "is-dry" : ""].join(" ")}
      aria-hidden
    >
      <img
        className="scene-bg"
        src="/field/plot-backdrop.webp"
        srcSet="/field/plot-backdrop-sm.webp 960w, /field/plot-backdrop.webp 1920w"
        sizes="100vw"
        alt=""
      />
      <div className="scene-haze" />
      <div className="scene-cast">
        <img className="sprite farmer" src="/field/farmer.webp" alt="" />
        <div className="crop-row">
          {SHOWN.map((c) => (
            <img
              key={c}
              className={`sprite crop crop-${c} ${pick === c ? "picked" : hasPick ? "dim" : ""}`}
              src={`/field/${c}.webp`}
              alt=""
            />
          ))}
          {other ? <img className="sprite crop crop-seedling picked" src="/field/seedling.webp" alt="" /> : null}
        </div>
        <div className="well-group">
          <img className="sprite bucket" src="/field/bucket.webp" alt="" />
          <img className="sprite well" src="/field/well.webp" alt="" />
        </div>
      </div>
    </div>
  );
}
