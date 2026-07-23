"""
Vision-to-code UI generator — Figma screenshot + filtered JSON → React/Tailwind TSX.

Runs as Product Factory soft phase `ui_codegen` (after page_ux). Never raises into
the invent hard-fail path; callers treat None/empty as "skipped / fallback to page_specs".
"""

from __future__ import annotations

import json
import re
from typing import Any

import structlog

log = structlog.get_logger(__name__)

VISION_SYSTEM = """You are a principal frontend engineer. Produce pixel-perfect, responsive
React + Tailwind CSS from the Figma screenshot and layout JSON. Output executable TypeScript
React (.tsx) only — no markdown prose outside code fences.

Requirements:
- Functional React components with TypeScript
- Tailwind utility classes (no CSS modules)
- lucide-react icons where icons appear
- Match spacing, typography, and hex colors from the Figma JSON
- Mobile-first responsive layout
- Standalone product shell (no OMNIA chrome): soft canvas, centered brand, bottom frosted pill nav when the design implies it

Return a JSON object (you may wrap it in a ```json fence) shaped as:
{
  "files": {
    "src/App.tsx": "...full file source...",
    "src/components/Dashboard.tsx": "...",
    "...additional component paths..."
  }
}
Every file value must be complete, runnable TSX source (imports included)."""


async def generate_frontend_from_figma(
    *,
    workspace: dict[str, Any],
    user_prompt: str,
    llm_complete: Any | None = None,
    preferred_model: str | None = None,
    parse_json: Any | None = None,
) -> dict[str, Any] | None:
    """
    Match template → fetch Figma node/image → vision LLM → {files: {...}}.

    Returns None when codegen is disabled, DEMO_MODE, token missing, placeholder
    template, or any step fails (caller keeps page_ux heuristics).
    """
    if not _codegen_enabled():
        return None

    try:
        from services.figma.client import FigmaAPIClient, FigmaAPIError
        from services.figma.matcher import find_best_figma_template
    except Exception as e:
        log.warning("ui_codegen.import_failed", error=str(e))
        return None

    domain = str(
        (workspace.get("ai_core") or {}).get("domain")
        or workspace.get("product_type")
        or ""
    )
    match = find_best_figma_template(user_prompt, domain=domain)
    workspace["figma_template"] = {
        "id": match.get("id"),
        "file_key": match.get("file_key"),
        "node_id": match.get("node_id"),
        "domain": match.get("domain"),
        "score": match.get("score"),
        "match_method": match.get("match_method"),
        "placeholder": bool(match.get("placeholder")),
    }

    file_key = str(match.get("file_key") or "")
    node_id = str(match.get("node_id") or "0:1")
    if not file_key or file_key.startswith("PLACEHOLDER") or match.get("placeholder"):
        log.info("ui_codegen.skip_placeholder_template", template_id=match.get("id"))
        # Prefer Collections seed when match landed on a placeholder — retry Collections
        if match.get("id") != "collections_curation":
            from services.figma.matcher import SEED_TEMPLATES

            collections = next((t for t in SEED_TEMPLATES if t.get("id") == "collections_curation"), None)
            if collections:
                file_key = str(collections["file_key"])
                node_id = str(collections.get("node_id") or "0:1")
                workspace["figma_template"]["fallback_to"] = "collections_curation"
            else:
                return None
        else:
            return None

    client = FigmaAPIClient()
    if not client.configured:
        log.info("ui_codegen.skip_no_token")
        return None

    try:
        node_payload = client.get_node_json(file_key, node_id)
        image_url = client.get_node_image(file_key, node_id)
    except FigmaAPIError as e:
        log.warning("ui_codegen.figma_failed", error=str(e), status=e.status_code)
        return None
    except Exception as e:
        log.warning("ui_codegen.figma_unexpected", error=str(e))
        return None

    prd = workspace.get("prd") or {}
    ia = workspace.get("information_architecture") or {}
    ds = workspace.get("design_system") or {}
    specs = workspace.get("page_specs") or {}
    requirements = {
        "name": workspace.get("name"),
        "uvp": workspace.get("uvp"),
        "daily_workflow": workspace.get("daily_workflow"),
        "prd_goals": (prd.get("goals") if isinstance(prd, dict) else None) or [],
        "functional_requirements": (prd.get("functional_requirements") if isinstance(prd, dict) else None) or [],
        "nav": (ia.get("nav") if isinstance(ia, dict) else None) or [],
        "pages": (ia.get("pages") if isinstance(ia, dict) else None) or [],
        "page_specs": specs,
        "design_personality": ds.get("personality") if isinstance(ds, dict) else "",
        "tokens": (ds.get("tokens") if isinstance(ds, dict) else None) or {},
        "figma_extracted": node_payload.get("extracted") or {},
    }

    files = await _vision_codegen(
        image_url=image_url,
        figma_document=node_payload.get("document") or {},
        requirements=requirements,
        llm_complete=llm_complete,
        preferred_model=preferred_model,
        parse_json=parse_json,
    )
    if not files:
        return None

    return {
        "generated_frontend": {
            "files": files,
            "source": {
                "figma_file_key": file_key,
                "figma_node_id": node_id,
                "image_url": image_url,
                "template_id": (workspace.get("figma_template") or {}).get("id"),
            },
        },
        "design_system": {
            "chrome": {"codegen": True},
        },
    }


async def _vision_codegen(
    *,
    image_url: str,
    figma_document: dict[str, Any],
    requirements: dict[str, Any],
    llm_complete: Any | None,
    preferred_model: str | None,
    parse_json: Any | None,
) -> dict[str, str] | None:
    figma_blob = json.dumps(figma_document, default=str)[:14000]
    req_blob = json.dumps(requirements, default=str)[:6000]
    user_text = (
        f"Screenshot URL (fetch/view this image): {image_url}\n\n"
        f"Filtered Figma layout JSON:\n{figma_blob}\n\n"
        f"Product PRD / IA / design requirements:\n{req_blob}\n\n"
        "Generate the React+Tailwind files JSON now."
    )

    raw: str | None = None
    # Prefer multimodal OpenRouter/OpenAI when available
    raw = await _vision_http_complete(
        system=VISION_SYSTEM,
        user_text=user_text,
        image_url=image_url,
        preferred_model=preferred_model,
    )
    if not raw and llm_complete is not None:
        try:
            # Text-only fallback: include URL + JSON (model may not see pixels)
            result = await llm_complete(
                system=VISION_SYSTEM,
                user=user_text,
                preferred_model=preferred_model,
                max_tokens=6000,
            )
            if isinstance(result, tuple):
                raw = result[0]
            else:
                raw = str(result)
        except Exception as e:
            log.warning("ui_codegen.llm_fallback_failed", error=str(e))
            return None

    if not raw:
        return None

    data = None
    if parse_json:
        try:
            data = parse_json(raw)
        except Exception:
            data = None
    if not data:
        data = _extract_files_json(raw)
    if not isinstance(data, dict):
        return None
    files = data.get("files") if isinstance(data.get("files"), dict) else data
    if not isinstance(files, dict) or not files:
        return None
    cleaned: dict[str, str] = {}
    for path, src in list(files.items())[:24]:
        if not isinstance(path, str) or not isinstance(src, str):
            continue
        p = path.strip()[:200]
        if not p.endswith((".tsx", ".ts", ".jsx", ".js", ".css")):
            continue
        cleaned[p] = src[:120_000]
    return cleaned or None


async def _vision_http_complete(
    *,
    system: str,
    user_text: str,
    image_url: str,
    preferred_model: str | None,
) -> str | None:
    """Call OpenRouter or OpenAI chat completions with an image_url part."""
    try:
        from config import settings
    except Exception:
        return None

    import httpx

    model = (preferred_model or "").strip() or getattr(settings, "LLM_GENERATION_MODEL", "gpt-4o")
    openrouter_key = str(getattr(settings, "OPENROUTER_API_KEY", "") or "").strip()
    openai_key = str(getattr(settings, "OPENAI_API_KEY", "") or "").strip()

    messages = [
        {"role": "system", "content": system[:8000]},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": user_text[:12000]},
                {"type": "image_url", "image_url": {"url": image_url}},
            ],
        },
    ]

    if openrouter_key and not openrouter_key.startswith("sk-demo"):
        url = str(getattr(settings, "OPENROUTER_API_URL", "https://openrouter.ai/api/v1")).rstrip("/")
        # Prefer a vision-capable OpenRouter model when the preferred id is unknown
        or_model = model if "/" in model or model.startswith("gpt") or "claude" in model else "openai/gpt-4o"
        if model and "/" not in model and model.startswith("gpt"):
            or_model = f"openai/{model}"
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    f"{url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openrouter_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": or_model,
                        "messages": messages,
                        "temperature": 0.3,
                        "max_tokens": 6000,
                    },
                )
                if resp.status_code >= 400:
                    log.warning("ui_codegen.openrouter_status", status=resp.status_code, body=resp.text[:200])
                    return None
                return str(resp.json()["choices"][0]["message"]["content"]).strip()
        except Exception as e:
            log.warning("ui_codegen.openrouter_failed", error=str(e))

    if openai_key and not openai_key.startswith("sk-demo"):
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openai_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model if model.startswith("gpt") else "gpt-4o",
                        "messages": messages,
                        "temperature": 0.3,
                        "max_tokens": 6000,
                    },
                )
                if resp.status_code >= 400:
                    log.warning("ui_codegen.openai_status", status=resp.status_code, body=resp.text[:200])
                    return None
                return str(resp.json()["choices"][0]["message"]["content"]).strip()
        except Exception as e:
            log.warning("ui_codegen.openai_failed", error=str(e))
    return None


def _extract_files_json(raw: str) -> dict[str, Any] | None:
    text = (raw or "").strip()
    # Prefer fenced json
    m = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
    blob = m.group(1) if m else None
    if not blob:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            blob = text[start : end + 1]
    if not blob:
        return None
    try:
        return json.loads(blob)
    except Exception:
        return None


def _codegen_enabled() -> bool:
    try:
        from config import settings

        if bool(getattr(settings, "DEMO_MODE", False)):
            return False
        return bool(getattr(settings, "PRODUCT_FACTORY_FIGMA_CODEGEN", False))
    except Exception:
        import os

        return os.environ.get("PRODUCT_FACTORY_FIGMA_CODEGEN", "").lower() in ("1", "true", "yes")
