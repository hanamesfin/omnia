"""
Writable paths for standalone / serverless.

Vercel (and AWS Lambda) mount the app under a read-only tree (`/var/task`).
Only `/tmp` is writable. Anything that persists JSON/JSONL must use this helper
or Create/auth will explode with Errno 30.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

_API_ROOT = Path(__file__).resolve().parent


def is_serverless() -> bool:
    if os.environ.get("VERCEL"):
        return True
    if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return True
    if os.environ.get("LAMBDA_TASK_ROOT"):
        return True
    # Deployed code lives under /var/task on Vercel Python runtimes.
    try:
        return str(_API_ROOT).startswith("/var/task")
    except Exception:
        return False


def data_dir(name: str = ".omnia_data") -> Path:
    """
    Directory that is safe to mkdir + write.
    Serverless → /tmp/<name>. Local → apps/api/<name> (or /tmp fallback).
    """
    if is_serverless():
        root = Path(tempfile.gettempdir()) / name.lstrip("/")
    else:
        root = _API_ROOT / name
    try:
        root.mkdir(parents=True, exist_ok=True)
        # Prove we can actually write (some mounts look writable then fail).
        probe = root / ".write_probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return root
    except OSError:
        fallback = Path(tempfile.gettempdir()) / name.lstrip("/")
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback


def data_file(filename: str) -> Path:
    """Convenience: writable file path under the data dir."""
    return data_dir() / filename
