# Field Shift — NASA Space Apps 2026

Crop rotation advice for the Barind tract (pilot: **Godagari** and **Tanore**, Rajshahi).

NASA POWER, cached SMAP / MODIS, and SRDI soil turn every rotation into scores. A System One model (Jev) picks one allowed rotation and checks English and Bangla headlines for a glut. The zone plan for an upazila stops every farm landing on the same crop, and remembers who gave up the top crop so they are first next season. A language model only explains that assignment.

Original data notes: [BUILD_GUIDE.md](BUILD_GUIDE.md).

## Run

1. Copy the env file and set the keys. Do not commit them.

```bash
cp .env.example .env.local
```

`OPENCODE_API_KEY` is the Jev key. `GROQ_API_KEY` is optional; without it the explanation is a short scorer template. `DATABASE_URL` in the example matches the Compose database.

2. Start Postgres (optional):

```bash
docker compose up -d
```

Without a reachable `DATABASE_URL`, the zone plan is kept in a local file store (`data/cache/zone-store.json`) with the same rules, so advice still works. Without `OPENCODE_API_KEY` the top scorer pick is used and the market check scans the headlines for glut words; without `GROQ_API_KEY` the explanation is a rule-based template in English and Bangla.

3. Install once, then start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Enter a farm name, pick a union, and get advice. The same farm name in an upazila updates that farm's row.

To fill a zone with neighbour farms for a demo:

```bash
node scripts/seed_zone.mjs http://localhost:3000 Godagari
```

The header art lives in `public/field/` (scene sprites) and `public/crops/` (crop icons); prompts are in `img_prompts/`.

## Layout

| Path | What |
| --- | --- |
| `app/`, `components/`, `lib/`, `i18n/` | Next.js app, UI, scoring and zone logic, English and Bangla strings |
| `data/` | Seed crops and rotations, SRDI CSVs, union list, cached SMAP/MODIS, market headlines |
| `samples/` | Recorded NASA POWER and AppEEARS responses used as offline fallbacks |
| `public/field/`, `public/crops/` | Header scene art and crop icons (prompts in `img_prompts/`) |
| `scripts/` | AppEEARS and SRDI refresh, demo and zone seeding scripts |
| `srdi_raw/` | Raw SRDI/BARC downloads and the scripts that build `data/srdi/` |
| `docs/` | How it works and the pipeline diagram |
| `schemas/` | Explanation output schema |

## Tests

```bash
npm test
```

## Data

POWER responses cache under `data/cache/` on first request. AppEEARS and SRDI refresh scripts live in `scripts/`. Crop traits in `data/seed/crops.json` are still placeholders; see BUILD_GUIDE before treating margins as measured.

Headlines the decision model reads: `data/market/headlines.json`. Add a line there to include it in the next market check.
