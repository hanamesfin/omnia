"""Vercel Python serverless entry — mounts the standalone FastAPI app."""
from __future__ import annotations

import sys
from pathlib import Path

# Project root (apps/api) must be importable when this file lives in api/.
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from standalone import app  # noqa: E402

__all__ = ["app"]
