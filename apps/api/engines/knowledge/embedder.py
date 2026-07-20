"""Embeddings for knowledge chunks — MiniLM when available, deterministic fallback for tests/offline."""
from __future__ import annotations

import hashlib
import math
import struct
from typing import Callable

EMBEDDING_DIM = 384


def _hash_embed(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
    """Deterministic bag-hash embedding (unit-normalized). Good enough for local demos/tests."""
    vec = [0.0] * dim
    tokens = (text or "").lower().split()
    if not tokens:
        tokens = ["_empty_"]
    for tok in tokens:
        digest = hashlib.sha256(tok.encode("utf-8")).digest()
        for i in range(0, min(len(digest), 32), 4):
            idx = struct.unpack_from(">I", digest, i)[0] % dim
            sign = 1.0 if digest[i] % 2 == 0 else -1.0
            vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


_embed_fn: Callable[[str], list[float]] | None = None


def embed(text: str) -> list[float]:
    global _embed_fn
    if _embed_fn is None:
        try:
            from engines.memory.retriever import embed as mini_embed

            # Probe once
            probe = mini_embed("probe")
            if isinstance(probe, list) and len(probe) == EMBEDDING_DIM:
                _embed_fn = mini_embed
            else:
                _embed_fn = _hash_embed
        except Exception:
            _embed_fn = _hash_embed
    return _embed_fn(text)


def cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    return sum(x * y for x, y in zip(a, b))
