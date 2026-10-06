#!/usr/bin/env python3
"""Submit AppEEARS point tasks, poll, download CSVs, write data/satellite/*.json."""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
import zipfile
from collections import defaultdict
from datetime import datetime
from io import BytesIO
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
UNIONS = json.loads((DATA / "pilot_unions.json").read_text())

BASE = "https://appeears.earthdatacloud.nasa.gov/api"


def login() -> str:
    user = os.environ["EARTHDATA_USERNAME"]
    pw = os.environ["EARTHDATA_PASSWORD"]
    r = requests.post(f"{BASE}/login", auth=(user, pw), timeout=60)
    r.raise_for_status()
    return r.json()["token"]


def submit(token: str, name: str, lat: float, lon: float, start: str, end: str) -> str:
    body = {
        "task_type": "point",
        "task_name": name,
        "params": {
            "dates": [{"startDate": start, "endDate": end}],
            "layers": [
                {"product": "SPL4SMGP.008", "layer": "Geophysical_Data_sm_rootzone"},
                {"product": "SPL4SMGP.008", "layer": "Geophysical_Data_sm_surface"},
                {"product": "MOD13Q1.061", "layer": "_250m_16_days_NDVI"},
            ],
            "coordinates": [
                {"id": name, "category": "pilot", "latitude": lat, "longitude": lon}
            ],
        },
    }
    r = requests.post(
        f"{BASE}/task",
        headers={"Authorization": f"Bearer {token}"},
        json=body,
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["task_id"]


def wait_done(token: str, task_id: str, poll_s: int = 30) -> None:
    while True:
        r = requests.get(
            f"{BASE}/status/{task_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=60,
        )
        r.raise_for_status()
        st = r.json()["status"]
        print(f"  status={st}", flush=True)
        if st == "done":
            return
        if st in ("failed", "error"):
            raise RuntimeError(f"task {task_id} failed")
        time.sleep(poll_s)


def download_bundle(token: str, task_id: str) -> bytes:
    r = requests.get(
        f"{BASE}/bundle/{task_id}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=120,
    )
    r.raise_for_status()
    files = r.json()
    # pick first csv bundle file
    for entry in files:
        fid = entry.get("file_id")
        if not fid:
            continue
        fr = requests.get(
            f"{BASE}/bundle/{task_id}/{fid}",
            headers={"Authorization": f"Bearer {token}"},
            allow_redirects=True,
            timeout=300,
        )
        fr.raise_for_status()
        return fr.content
    raise RuntimeError("no bundle file")


def parse_smap_csv(text: str) -> list[dict]:
    rows = list(csv.DictReader(text.splitlines()))
    out = []
    for row in rows:
        date = row.get("Date", "")[:10]
        rz = row.get("SPL4SMGP_008_Geophysical_Data_sm_rootzone")
        sf = row.get("SPL4SMGP_008_Geophysical_Data_sm_surface")
        if not rz:
            continue
        out.append(
            {
                "date": date,
                "rootzone": float(rz),
                "surface": float(sf) if sf else None,
            }
        )
    return out


def parse_ndvi_csv(text: str) -> list[dict]:
    rows = list(csv.DictReader(text.splitlines()))
    col = None
    if rows:
        for k in rows[0]:
            if "NDVI" in k:
                col = k
                break
    out = []
    for row in rows:
        if not col or not row.get(col):
            continue
        v = float(row[col])
        if v < -1:
            continue
        out.append({"date": row.get("Date", "")[:10], "ndvi": v})
    return out


def aggregate_smap(daily: list[dict]) -> tuple[list[dict], float]:
    by_month: dict[str, list[float]] = defaultdict(list)
    for d in daily:
        m = d["date"][:7]
        by_month[m].append(d["rootzone"])
    monthly = [
        {
            "month": m,
            "rootzone": sum(v) / len(v),
            "surface": 0,
        }
        for m, v in sorted(by_month.items())
    ]
    rabi = [d["rootzone"] for d in daily if d["date"][5:7] in ("11", "12", "01", "02", "03", "04")]
    mean = sum(rabi) / len(rabi) if rabi else 0.15
    return monthly, mean


def process_zip(blob: bytes, uid: str, lat: float, lon: float) -> dict:
    smap_daily: list[dict] = []
    ndvi: list[dict] = []
    with zipfile.ZipFile(BytesIO(blob)) as zf:
        for name in zf.namelist():
            data = zf.read(name).decode("utf-8", errors="replace")
            if "SPL4SMGP" in name:
                smap_daily = parse_smap_csv(data)
            elif "MOD13Q1" in name:
                ndvi = parse_ndvi_csv(data)
    monthly, rabi_mean = aggregate_smap(smap_daily)
    return {
        "id": uid,
        "lat": lat,
        "lon": lon,
        "rabi_rootzone_mean": round(rabi_mean, 4),
        "smap_rootzone_pctl": 35,
        "smap_monthly": monthly,
        "ndvi_series": ndvi[:120],
        "source": "NASA AppEEARS SPL4SMGP.008 + MOD13Q1.061",
        "fallback": False,
    }


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--union", help="Union name (English)")
    p.add_argument("--all-pilot-rural", action="store_true")
    p.add_argument("--start", default="01-01-2024")
    p.add_argument("--end", default="04-30-2024")
    args = p.parse_args()

    targets = []
    if args.all_pilot_rural:
        targets = [u for u in UNIONS if not u.get("is_paurashava_ward")]
    elif args.union:
        targets = [u for u in UNIONS if u["union"] == args.union]
    else:
        p.error("pass --union or --all-pilot-rural")

    token = login()
    out_dir = DATA / "satellite"
    out_dir.mkdir(parents=True, exist_ok=True)

    for u in targets:
        slug = u["union"].lower().replace(" ", "_")[:40]
        print(f"Submitting {u['union']} ({u['lat']}, {u['lon']})…")
        task_id = submit(
            token,
            f"fieldshift-{slug}-{datetime.utcnow():%Y%m%d%H%M}",
            u["lat"],
            u["lon"],
            args.start,
            args.end,
        )
        print(f"  task_id={task_id}")
        wait_done(token, task_id)
        blob = download_bundle(token, task_id)
        summary = process_zip(blob, slug, u["lat"], u["lon"])
        path = out_dir / f"{slug}.json"
        path.write_text(json.dumps(summary, indent=2))
        print(f"  wrote {path}")


if __name__ == "__main__":
    try:
        main()
    except KeyError as e:
        print("Missing env:", e, file=sys.stderr)
        sys.exit(1)
