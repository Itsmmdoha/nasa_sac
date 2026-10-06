# Field Shift — NASA Space Apps 2026

Crop rotation decision support for farmers in the Barind tract (pilot: **Godagari** and **Tanore**, Rajshahi). Combines NASA POWER / SMAP / NDVI with **SRDI** soil data, a deterministic scorer, and Groq (`openai/gpt-oss-120b`) for ranking and plain-language explanations.

Full pipeline and data notes: [BUILD_GUIDE.md](BUILD_GUIDE.md).

## Prerequisites

- Node.js 20+
- Python 3.11+ (optional, for NASA prefetch scripts)
- `requests` for AppEEARS script: `pip install requests`

## Setup

```bash
cp .env.example .env.local
# Live Groq explanations (default: MOCK_LLM=0):
# GROQ_API_KEY=...
# Offline demo only: MOCK_LLM=1

# Optional for AppEEARS prefetch only (never commit):
# set -a; source secrets/earthdata.env; set +a
```

Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Pick a rural union, answer the form, **Get advice**.

## Tests and demo

```bash
npm test
# With dev server running:
node scripts/demo_kalma.mjs
# Without GROQ_API_KEY you get rule-based ranking (not mock JSON).
# Set MOCK_LLM=1 only to force data/mock/llm_response.json.
```

## Fetch / refresh NASA data

**POWER** — cached automatically on first API request per grid cell under `data/cache/`. Offline demo uses `samples/power_*.json`.

**AppEEARS** (slow; run ahead of demos):

```bash
export EARTHDATA_USERNAME=...
export EARTHDATA_PASSWORD=...
python scripts/appeears_pull.py --union Kalma
# or all 16 rural unions:
python scripts/appeears_pull.py --all-pilot-rural
```

Writes `data/satellite/<union>.json`. Shipped sample: `data/satellite/godagari_pilot.json` from `samples/appeears_bundle/`.

**SRDI CSVs** — already in `data/srdi/`. To refresh from WFS:

```bash
python scripts/srdi_refresh.py
```

## Project layout

| Path | Purpose |
|------|---------|
| `app/` | UI + API routes (`/api/advice`, `/api/soil`, `/api/climate`) |
| `lib/` | Scorer, POWER, soil, Groq client, validation |
| `data/` | SRDI CSVs, seeds, mock LLM, satellite summaries, cache |
| `schemas/rotation_advice.schema.json` | Groq strict JSON schema |
| `scripts/` | `appeears_pull.py`, `demo_kalma.mjs` |

## Still mocked or placeholder

- **Crop traits** in `data/seed/crops.json` (`_placeholders: true`) — irrigation, pH bands, margins; verify against BRRI/BARI before judging (see BUILD_GUIDE §6.7).
- **`relative_margin_index`** — placeholder until DAE/BBS cost-and-return data.
- **Chickpea / mungbean irrigation (mm)** — estimated, not from the NW hydrology paper.
- **Satellite per union** — uses nearest cached point until you run `appeears_pull.py` for each union.
- **Paurashava wards** — in `pilot_unions.json` but excluded from the form; FRS rows cover selected rural unions only.
- **IMERG / GES DISC** — not wired (Earthdata app approval pending).
- **Groq** — with `GROQ_API_KEY`, live model by default. Without a key: rule-based scorer text (no mock file). `MOCK_LLM=1` forces `data/mock/llm_response.json`. Rate limits fall back to the 20b model, then the scorer.

Secrets must only live in env vars (`.env.local`, `secrets/*.env`); never commit them.
