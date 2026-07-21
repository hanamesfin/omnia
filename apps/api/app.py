"""Vercel FastAPI entrypoint — re-export the slim standalone app."""
from standalone import app

__all__ = ["app"]
