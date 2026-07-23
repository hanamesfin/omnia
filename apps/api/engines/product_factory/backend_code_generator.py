"""
Backend synthesizer — PRD + IA + generated_frontend → FastAPI stubs + schema sketches.

Placed as soft phase `backend_codegen` after `architecture` (and after `ui_codegen` in
PHASE_ORDER) so entities/modules and frontend tool needs are available. Intentionally
before `ai_core` so invent still finishes AI prompt even if backend stubs are thin;
ai_core tools are optional enrichment when already present on the workspace.

Soft: never fails invent when skipped or stub-only.
"""

from __future__ import annotations

import json
import re
from typing import Any

import structlog

log = structlog.get_logger(__name__)

BACKEND_SYSTEM = """You are a principal backend engineer. Given a product PRD, information
architecture, and optional generated frontend file list, synthesize a FastAPI backend
scaffold. Prefer FastAPI + Pydantic. Return JSON only:

{
  "files": {
    "main.py": "...",
    "app/models.py": "...",
    "app/schemas.py": "...",
    "app/routers/tools.py": "...",
    "app/db/schema.sql": "..."
  }
}

Include:
- Route stubs matching nav/pages and AI tool endpoints the frontend would call
- Pydantic request/response models
- SQL or SQLAlchemy-style schema sketches for core entities
- CORS-ready FastAPI app entrypoint
Keep files concise but executable stubs (raise HTTPException 501 where unimplemented)."""


async def generate_backend_scaffold(
    *,
    workspace: dict[str, Any],
    llm_complete: Any | None = None,
    preferred_model: str | None = None,
    parse_json: Any | None = None,
) -> dict[str, Any] | None:
    """
    Synthesize FastAPI files into workspace.generated_backend.
    Uses LLM when available; otherwise deterministic stubs from architecture/PRD.
    Returns None only when feature flag is off.
    """
    if not _codegen_enabled():
        return None

    frontend = workspace.get("generated_frontend") or {}
    frontend_files = list((frontend.get("files") or {}).keys()) if isinstance(frontend, dict) else []
    arch = workspace.get("architecture") or {}
    prd = workspace.get("prd") or {}
    ia = workspace.get("information_architecture") or {}
    ai_core = workspace.get("ai_core") or {}

    context = {
        "name": workspace.get("name"),
        "product_type": workspace.get("product_type"),
        "uvp": workspace.get("uvp"),
        "functional_requirements": (prd.get("functional_requirements") if isinstance(prd, dict) else None) or [],
        "entities": (arch.get("entities") if isinstance(arch, dict) else None) or [],
        "modules": (arch.get("modules") if isinstance(arch, dict) else None) or [],
        "nav": (ia.get("nav") if isinstance(ia, dict) else None) or [],
        "pages": (ia.get("pages") if isinstance(ia, dict) else None) or [],
        "frontend_files": frontend_files[:40],
        "ai_tools": (ai_core.get("tools") if isinstance(ai_core, dict) else None) or [],
        "ai_core_integration": (arch.get("ai_core_integration") if isinstance(arch, dict) else None) or "",
    }

    files: dict[str, str] | None = None
    if llm_complete is not None:
        try:
            user = (
                "Synthesize the FastAPI backend for this product.\n\n"
                f"{json.dumps(context, default=str)[:8000]}\n\n"
                "Return JSON with a files map only."
            )
            raw, _used = await llm_complete(
                system=BACKEND_SYSTEM,
                user=user,
                preferred_model=preferred_model,
                max_tokens=4000,
            )
            data = parse_json(raw) if parse_json else _parse_files(raw)
            if isinstance(data, dict):
                candidate = data.get("files") if isinstance(data.get("files"), dict) else data
                if isinstance(candidate, dict) and candidate:
                    files = {
                        str(k)[:200]: str(v)[:80_000]
                        for k, v in list(candidate.items())[:20]
                        if isinstance(v, str) and str(k).endswith((".py", ".sql", ".toml", ".md"))
                    }
        except Exception as e:
            log.warning("backend_codegen.llm_failed", error=str(e))

    if not files:
        files = _heuristic_backend_files(context)

    return {
        "generated_backend": {
            "files": files,
            "framework": "fastapi",
            "source": "llm" if files and llm_complete else "heuristic",
        }
    }


def _heuristic_backend_files(ctx: dict[str, Any]) -> dict[str, str]:
    name = str(ctx.get("name") or "Product").replace('"', "")
    entities = [str(e) for e in (ctx.get("entities") or ["Item", "Project"])][:8]
    nav = ctx.get("nav") or []
    tools = [str(t) for t in (ctx.get("ai_tools") or ["run"])][:8]
    entity_classes = "\n\n".join(_entity_pydantic(e) for e in entities)
    routes = "\n\n".join(_page_route(n) for n in nav if isinstance(n, dict))
    tool_routes = "\n\n".join(_tool_route(t) for t in tools)
    slug_entities = [_slug(e) for e in entities]

    main_py = f'''"""{name} — FastAPI entry (Product Factory generated stub)."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import pages, tools

app = FastAPI(title="{name}", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(pages.router, prefix="/api/v1")
app.include_router(tools.router, prefix="/api/v1/tools")


@app.get("/health")
def health() -> dict[str, str]:
    return {{"status": "ok", "product": "{name}"}}
'''

    schemas_py = f'''"""Pydantic schemas — generated stub."""
from __future__ import annotations

from pydantic import BaseModel, Field


class HealthOut(BaseModel):
    status: str
    product: str


{entity_classes}


class ToolRunIn(BaseModel):
    tool: str
    payload: dict = Field(default_factory=dict)


class ToolRunOut(BaseModel):
    ok: bool
    result: dict = Field(default_factory=dict)
    message: str = ""
'''

    models_py = f'''"""ORM / domain models sketch — generated stub."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


{chr(10).join(_entity_dataclass(e) for e in entities)}
'''

    pages_py = f'''"""Page-aligned CRUD route stubs — generated."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["pages"])


{routes or '''@router.get("/workspace")
def workspace() -> dict:
    return {"items": []}
'''}
'''

    tools_py = f'''"""AI / product tool endpoints — generated stub."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(tags=["tools"])


class ToolBody(BaseModel):
    payload: dict = Field(default_factory=dict)


{tool_routes}


@router.post("/run")
def run_tool(body: ToolBody) -> dict:
    raise HTTPException(501, "Wire to Omnia AI core")
'''

    schema_sql = "-- Generated schema sketch\n" + "\n".join(
        f"CREATE TABLE IF NOT EXISTS {s} (\n"
        f"  id TEXT PRIMARY KEY,\n"
        f"  name TEXT NOT NULL,\n"
        f"  data JSONB DEFAULT '{{}}',\n"
        f"  created_at TIMESTAMPTZ DEFAULT NOW()\n"
        f");"
        for s in slug_entities
    )

    init_routers = '"""Routers package."""\n'
    return {
        "main.py": main_py,
        "app/__init__.py": "",
        "app/schemas.py": schemas_py,
        "app/models.py": models_py,
        "app/routers/__init__.py": init_routers,
        "app/routers/pages.py": pages_py,
        "app/routers/tools.py": tools_py,
        "app/db/schema.sql": schema_sql,
    }


def _entity_pydantic(name: str) -> str:
    cls = _pascal(name)
    return (
        f"class {cls}Create(BaseModel):\n"
        f"    name: str\n"
        f"    data: dict = Field(default_factory=dict)\n\n"
        f"class {cls}Out({cls}Create):\n"
        f"    id: str\n"
    )


def _entity_dataclass(name: str) -> str:
    cls = _pascal(name)
    return (
        f"@dataclass\n"
        f"class {cls}:\n"
        f"    id: str\n"
        f"    name: str\n"
        f"    data: dict[str, Any] = field(default_factory=dict)\n"
        f"    created_at: datetime | None = None\n"
    )


def _page_route(nav_item: dict[str, Any]) -> str:
    pid = _slug(str(nav_item.get("id") or "page"))
    label = str(nav_item.get("label") or pid)
    return (
        f'@router.get("/{pid}")\n'
        f"def get_{pid}() -> dict:\n"
        f'    """{label} list/detail stub."""\n'
        f"    return {{\"page\": \"{pid}\", \"items\": []}}\n"
    )


def _tool_route(tool: str) -> str:
    tid = _slug(tool)
    return (
        f'@router.post("/{tid}")\n'
        f"def tool_{tid}(body: ToolBody) -> dict:\n"
        f'    raise HTTPException(501, "Tool {tool} not wired")\n'
    )


def _pascal(name: str) -> str:
    parts = re.findall(r"[A-Za-z0-9]+", name or "Item")
    return "".join(p[:1].upper() + p[1:] for p in parts) or "Item"


def _slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", (name or "item").lower()).strip("_")
    return s[:48] or "item"


def _parse_files(raw: str) -> dict[str, Any] | None:
    text = (raw or "").strip()
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
