"""Figma REST API client — node JSON + PNG image URLs."""

from __future__ import annotations

import os
from typing import Any
from urllib.parse import quote

import structlog

log = structlog.get_logger(__name__)

FIGMA_API_BASE = "https://api.figma.com/v1"

# Keys kept when filtering node JSON (layout / Auto Layout / type / color).
_KEEP_KEYS = frozenset(
    {
        "id",
        "name",
        "type",
        "visible",
        "locked",
        "scrollBehavior",
        "children",
        "absoluteBoundingBox",
        "absoluteRenderBounds",
        "constraints",
        "layoutMode",
        "primaryAxisAlignItems",
        "counterAxisAlignItems",
        "primaryAxisSizingMode",
        "counterAxisSizingMode",
        "layoutWrap",
        "layoutAlign",
        "layoutGrow",
        "layoutPositioning",
        "itemSpacing",
        "counterAxisSpacing",
        "paddingLeft",
        "paddingRight",
        "paddingTop",
        "paddingBottom",
        "padding",
        "fills",
        "strokes",
        "strokeWeight",
        "cornerRadius",
        "rectangleCornerRadii",
        "effects",
        "characters",
        "style",
        "characterStyleOverrides",
        "styleOverrideTable",
        "lineHeightPx",
        "fontSize",
        "fontName",
        "fontWeight",
        "textAlignHorizontal",
        "textAlignVertical",
        "letterSpacing",
        "opacity",
        "blendMode",
        "clipsContent",
        "background",
        "backgroundColor",
        "componentId",
        "componentProperties",
        "overrides",
    }
)

# Drop noisy / huge keys even if nested under style/fills.
_DROP_KEYS = frozenset(
    {
        "exportSettings",
        "reactions",
        "transitionNodeID",
        "transitionDuration",
        "transitionEasing",
        "annotations",
        "pluginData",
        "sharedPluginData",
        "boundVariables",
        "variableConsumptionMap",
        "componentPropertyReferences",
        "devStatus",
        "isExposedInstance",
        "overflowDirection",
        "layoutVersion",
        "strokeAlign",
        "strokeCap",
        "strokeJoin",
        "strokeMiterLimit",
        "strokeDashes",
        "individualStrokeWeights",
        "arcData",
        "preserveRatio",
        "layoutGrids",
        "gridStyleId",
        "styles",
        "fillOverrideTable",
        "strokeOverrideTable",
        "hyperlink",
        "textAutoResize",
        "textTruncation",
        "maxLines",
    }
)


class FigmaAPIError(RuntimeError):
    """Raised when the Figma API is misconfigured or returns an error."""

    def __init__(self, message: str, *, status_code: int | None = None, retryable: bool = False):
        super().__init__(message)
        self.status_code = status_code
        self.retryable = retryable


class FigmaAPIClient:
    """Thin async/sync-friendly client. Methods are sync via httpx for simplicity in factory phases."""

    def __init__(self, access_token: str | None = None, *, timeout: float = 30.0):
        self.access_token = (access_token if access_token is not None else _resolve_token()).strip()
        self.timeout = timeout

    @property
    def configured(self) -> bool:
        return bool(self.access_token) and not self.access_token.startswith("PLACEHOLDER")

    def get_node_json(self, file_key: str, node_id: str) -> dict[str, Any]:
        """
        GET /v1/files/{file_key}/nodes?ids={node_id}
        Returns filtered layout JSON (Auto Layout, spacing, typography, hex colors).
        """
        file_key = (file_key or "").strip()
        node_id = _normalize_node_id(node_id)
        if not file_key or file_key.startswith("PLACEHOLDER"):
            raise FigmaAPIError("Invalid or placeholder Figma file_key", retryable=False)
        if not self.configured:
            raise FigmaAPIError(
                "FIGMA_ACCESS_TOKEN is not configured",
                status_code=401,
                retryable=False,
            )

        url = f"{FIGMA_API_BASE}/files/{quote(file_key)}/nodes"
        params = {"ids": node_id}
        data = self._get_json(url, params=params)
        nodes = data.get("nodes") if isinstance(data, dict) else None
        if not isinstance(nodes, dict) or not nodes:
            raise FigmaAPIError("Figma nodes response empty", retryable=True)

        # Prefer exact node; otherwise first entry
        entry = nodes.get(node_id) or next(iter(nodes.values()), None)
        if not isinstance(entry, dict):
            raise FigmaAPIError(f"Node '{node_id}' not found in file", retryable=False)
        document = entry.get("document") if isinstance(entry.get("document"), dict) else entry
        filtered = filter_figma_node(document)
        return {
            "file_key": file_key,
            "node_id": node_id,
            "name": str(filtered.get("name") or ""),
            "document": filtered,
            "extracted": extract_design_signals(filtered),
        }

    def get_node_image(self, file_key: str, node_id: str, *, scale: float = 2.0) -> str:
        """
        GET /v1/images/{file_key}?ids={node_id}&format=png
        Returns a temporary image URL (string).
        """
        file_key = (file_key or "").strip()
        node_id = _normalize_node_id(node_id)
        if not file_key or file_key.startswith("PLACEHOLDER"):
            raise FigmaAPIError("Invalid or placeholder Figma file_key", retryable=False)
        if not self.configured:
            raise FigmaAPIError(
                "FIGMA_ACCESS_TOKEN is not configured",
                status_code=401,
                retryable=False,
            )

        url = f"{FIGMA_API_BASE}/images/{quote(file_key)}"
        params = {
            "ids": node_id,
            "format": "png",
            "scale": str(scale),
        }
        data = self._get_json(url, params=params)
        images = data.get("images") if isinstance(data, dict) else None
        if not isinstance(images, dict):
            raise FigmaAPIError("Figma images response malformed", retryable=True)
        image_url = images.get(node_id) or next((v for v in images.values() if v), None)
        if not image_url:
            err = (data.get("err") if isinstance(data, dict) else None) or "no image URL"
            raise FigmaAPIError(f"Figma image unavailable: {err}", retryable=True)
        return str(image_url)

    def nodes_url(self, file_key: str, node_id: str) -> str:
        """Build the nodes endpoint URL (for tests / debugging)."""
        return (
            f"{FIGMA_API_BASE}/files/{quote(file_key)}/nodes"
            f"?ids={quote(_normalize_node_id(node_id))}"
        )

    def images_url(self, file_key: str, node_id: str, *, scale: float = 2.0) -> str:
        """Build the images endpoint URL (for tests / debugging)."""
        return (
            f"{FIGMA_API_BASE}/images/{quote(file_key)}"
            f"?ids={quote(_normalize_node_id(node_id))}&format=png&scale={scale}"
        )

    def _get_json(self, url: str, *, params: dict[str, str] | None = None) -> dict[str, Any]:
        import httpx

        headers = {"X-Figma-Token": self.access_token}
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(url, headers=headers, params=params)
        except Exception as e:
            log.warning("figma.http_failed", url=url, error=str(e))
            raise FigmaAPIError(f"Figma request failed: {e}", retryable=True) from e

        if response.status_code == 403:
            raise FigmaAPIError("Figma token forbidden or file inaccessible", status_code=403)
        if response.status_code == 404:
            raise FigmaAPIError("Figma file or node not found", status_code=404)
        if response.status_code == 429:
            raise FigmaAPIError("Figma rate limited", status_code=429, retryable=True)
        if response.status_code >= 400:
            raise FigmaAPIError(
                f"Figma API error {response.status_code}: {response.text[:240]}",
                status_code=response.status_code,
                retryable=response.status_code >= 500,
            )
        try:
            data = response.json()
        except Exception as e:
            raise FigmaAPIError(f"Invalid Figma JSON: {e}", retryable=True) from e
        if not isinstance(data, dict):
            raise FigmaAPIError("Unexpected Figma response type", retryable=True)
        return data


def filter_figma_node(node: Any, *, max_depth: int = 12, max_children: int = 40) -> Any:
    """Recursively keep layout-relevant keys and drop redundant Figma noise."""
    if not isinstance(node, dict):
        return node
    if max_depth < 0:
        return {"type": node.get("type"), "name": node.get("name")}

    out: dict[str, Any] = {}
    for key, value in node.items():
        if key in _DROP_KEYS:
            continue
        if key not in _KEEP_KEYS and key not in ("document",):
            # Allow unknown small primitives that look like design signals
            if isinstance(value, (str, int, float, bool)) and key.endswith(
                ("Color", "Radius", "Spacing", "Align", "Mode", "Weight", "Size")
            ):
                out[key] = value
            continue
        if key == "children" and isinstance(value, list):
            kids = [filter_figma_node(c, max_depth=max_depth - 1, max_children=max_children) for c in value[:max_children]]
            out[key] = [k for k in kids if k]
        elif key in ("fills", "strokes", "effects", "background") and isinstance(value, list):
            out[key] = [_simplify_paint(p) for p in value[:8]]
        elif key == "style" and isinstance(value, dict):
            out[key] = {
                k: value[k]
                for k in (
                    "fontFamily",
                    "fontPostScriptName",
                    "fontWeight",
                    "fontSize",
                    "letterSpacing",
                    "lineHeightPx",
                    "lineHeightPercent",
                    "textAlignHorizontal",
                    "textAlignVertical",
                )
                if k in value
            }
        elif isinstance(value, dict) and key in ("absoluteBoundingBox", "absoluteRenderBounds", "constraints", "backgroundColor"):
            out[key] = value
        elif isinstance(value, (str, int, float, bool, list, dict)) or value is None:
            if isinstance(value, dict):
                out[key] = filter_figma_node(value, max_depth=max_depth - 1, max_children=max_children)
            else:
                out[key] = value
    return out


def extract_design_signals(node: dict[str, Any]) -> dict[str, Any]:
    """Pull hex colors, typography, and Auto Layout spacing into a compact summary."""
    colors: list[str] = []
    fonts: list[str] = []
    spacings: list[float] = []

    def walk(n: Any) -> None:
        if not isinstance(n, dict):
            return
        for paint in n.get("fills") or []:
            if isinstance(paint, dict) and paint.get("hex"):
                colors.append(str(paint["hex"]))
            elif isinstance(paint, dict) and isinstance(paint.get("color"), dict):
                hx = _rgba_to_hex(paint["color"])
                if hx:
                    colors.append(hx)
        style = n.get("style") if isinstance(n.get("style"), dict) else {}
        fam = style.get("fontFamily")
        if not fam and isinstance(n.get("fontName"), dict):
            fam = (n.get("fontName") or {}).get("family")
        if fam:
            fonts.append(str(fam))
        for sk in ("itemSpacing", "counterAxisSpacing", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom"):
            if isinstance(n.get(sk), (int, float)):
                spacings.append(float(n[sk]))
        for child in n.get("children") or []:
            walk(child)

    walk(node)
    # Dedupe preserve order
    def uniq(seq: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for x in seq:
            if x not in seen:
                seen.add(x)
                out.append(x)
        return out

    return {
        "colors": uniq(colors)[:16],
        "fonts": uniq(fonts)[:8],
        "spacing_samples": sorted(set(spacings))[:16],
        "layout_mode": node.get("layoutMode"),
        "name": node.get("name"),
        "type": node.get("type"),
    }


def _simplify_paint(paint: Any) -> Any:
    if not isinstance(paint, dict):
        return paint
    out: dict[str, Any] = {}
    for k in ("type", "visible", "opacity", "blendMode"):
        if k in paint:
            out[k] = paint[k]
    color = paint.get("color")
    if isinstance(color, dict):
        out["color"] = {k: color[k] for k in ("r", "g", "b", "a") if k in color}
        hx = _rgba_to_hex(color)
        if hx:
            out["hex"] = hx
    return out


def _rgba_to_hex(color: dict[str, Any]) -> str | None:
    try:
        r = int(round(float(color.get("r", 0)) * 255))
        g = int(round(float(color.get("g", 0)) * 255))
        b = int(round(float(color.get("b", 0)) * 255))
        return f"#{r:02x}{g:02x}{b:02x}"
    except Exception:
        return None


def _normalize_node_id(node_id: str) -> str:
    """Figma URLs use '-' ; API expects ':'."""
    raw = (node_id or "").strip()
    if not raw:
        return "0:1"
    return raw.replace("-", ":")


def _resolve_token() -> str:
    try:
        from config import settings

        return str(getattr(settings, "FIGMA_ACCESS_TOKEN", "") or "")
    except Exception:
        return os.environ.get("FIGMA_ACCESS_TOKEN", "") or ""
