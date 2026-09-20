#!/usr/bin/env python3
"""Build a canonical AvA package directory and optional archive."""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ava_package.cli import main

if __name__ == "__main__":
    raise SystemExit(main())
