"""Chunk long documents for embedding (~400 tokens with overlap)."""
from __future__ import annotations


def chunk_text(
    text: str,
    *,
    chunk_chars: int = 1600,
    overlap_chars: int = 200,
) -> list[str]:
    """
    Split text into overlapping character windows.
    ~400 tokens ≈ 1600 chars for English; overlap keeps context across boundaries.
    """
    cleaned = (text or "").strip()
    if not cleaned:
        return []
    if len(cleaned) <= chunk_chars:
        return [cleaned]

    chunks: list[str] = []
    start = 0
    n = len(cleaned)
    while start < n:
        end = min(n, start + chunk_chars)
        # Prefer breaking on paragraph / sentence boundary near the end
        if end < n:
            window = cleaned[start:end]
            for sep in ("\n\n", "\n", ". ", " "):
                idx = window.rfind(sep)
                if idx > chunk_chars // 3:
                    end = start + idx + len(sep)
                    break
        piece = cleaned[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= n:
            break
        start = max(0, end - overlap_chars)
        if start >= end:
            start = end
    return chunks
