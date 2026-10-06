#!/usr/bin/env node
/** End-to-end demo: Kalma, Tanore, Boro farmer with limited water (BUILD_GUIDE §6.8). */
const payload = {
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
  const rots = j.advice?.rotations ?? [];
  if (rots.length !== 3) {
    console.error("expected 3 rotations, got", rots.length);
    process.exit(1);
  }
  const ranks = rots.map((r) => r.rank).sort().join(",");
  if (ranks !== "1,2,3") {
    console.error("bad ranks", ranks);
    process.exit(1);
  }
  const top = rots.find((r) => r.rank === 1);
  const boro = rots.find((r) => r.rotation_id === "R1");
  if (top && boro && top.scores.water < boro.scores.water) {
    console.error("expected water-first ranking above Boro baseline");
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        source: j.meta?.source,
        top: top?.rotation_id,
        water_scores: rots.map((r) => ({ id: r.rotation_id, water: r.scores.water })),
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
