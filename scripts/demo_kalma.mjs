#!/usr/bin/env node
/** End-to-end demo: Kalma, Tanore, Boro farmer with limited water. */
const payload = {
  farm_name: "Demo farm",
  upazila: "Tanore",
  union: "Kalma",
  last_crops: { rabi: "boro", kharif1: "fallow", kharif2: "t_aman" },
  budget: "medium",
  water: "limited",
  can_sell: ["rice", "mustard", "lentil"],
  priorities: { profit: 3, soil: 4, water: 5 },
};

const base = process.env.DEMO_BASE_URL ?? "http://localhost:3000";

async function main() {
  const res = await fetch(`${base}/api/advice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("HTTP", res.status, text.slice(0, 500));
    process.exit(1);
  }
  const j = JSON.parse(text);
  const rot = j.advice?.rotation;
  if (!rot?.rotation_id) {
    console.error("expected one assigned rotation");
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        decision_source: j.advice.decision_source,
        explanation_source: j.meta?.source,
        rotation: rot.rotation_id,
        unsure: j.advice.unsure,
        deferred: j.advice.deferred,
        zone: j.advice.zone,
        market_note: j.advice.market_note,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
