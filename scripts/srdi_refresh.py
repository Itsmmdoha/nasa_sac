#!/usr/bin/env python3
"""Refresh SRDI CSVs from WFS (wraps srdi_raw/build_srdi_csv.py)."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "srdi_raw" / "build_srdi_csv.py"

if __name__ == "__main__":
    if not BUILD.exists():
        print("build_srdi_csv.py not found", file=sys.stderr)
        sys.exit(1)
    subprocess.check_call([sys.executable, str(BUILD)], cwd=ROOT / "srdi_raw")
