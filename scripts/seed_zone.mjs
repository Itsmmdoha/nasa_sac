// Fill a zone with neighbour farms so the zone plan has something to balance.
// Usage: node scripts/seed_zone.mjs [baseUrl] [upazila]
const base = process.argv[2] ?? "http://localhost:3000";
const upazila = process.argv[3] ?? "Godagari";
const unions = { Godagari: ["Deopara", "Matikata", "Pakri", "Rishikul", "Mohanpur", "Gogram"], Tanore: ["Kalma", "Badhair", "Talondo", "Saranjai", "Kamargaon", "Panchandar"] }[upazila];
const farms = [
  { name: "Karim east plot", water: "reliable", sell: ["rice", "mustard"], p: { profit: 5, soil: 2, water: 2 } },
  { name: "Selina's field", water: "reliable", sell: ["mustard", "lentil"], p: { profit: 4, soil: 3, water: 3 } },
  { name: "Abdul home plot", water: "limited", sell: ["mustard", "lentil", "pulse"], p: { profit: 3, soil: 4, water: 5 } },
  { name: "Jamal tube-well plot", water: "plenty", sell: ["rice", "maize", "mustard"], p: { profit: 5, soil: 2, water: 1 } },
  { name: "Rina south field", water: "limited", sell: ["lentil", "pulse", "wheat"], p: { profit: 2, soil: 5, water: 4 } },
  { name: "Hasan barind plot", water: "reliable", sell: ["mustard", "maize"], p: { profit: 4, soil: 3, water: 3 } },
];
for (const [i, f] of farms.entries()) {
  const res = await fetch(`${base}/api/advice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      farm_name: f.name,
      upazila,
      union: unions[i % unions.length],
      last_crops: { rabi: "boro", kharif1: "fallow", kharif2: "t_aman" },
      budget: "medium",
      water: f.water,
      can_sell: f.sell,
      priorities: f.p,
    }),
  });
  const j = await res.json();
  console.log(res.status, f.name, "→", j.advice?.rotation?.name ?? j.error, j.advice?.deferred ? "(deferred)" : "");
}
