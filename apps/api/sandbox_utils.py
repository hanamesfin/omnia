"""
Secure Python execution via E2B Code Interpreter (Firecracker micro-VMs).

Falls back to Piston when E2B is not configured. When an E2bSandboxSession is
attached to ToolContext, multiple code_execute calls in one agent turn share the
same Jupyter kernel (variables persist between cells).
"""
from __future__ import annotations

import json
from typing import Any

import httpx
import structlog

from config import settings

log = structlog.get_logger()

MAX_STDIO_CHARS = 20_000
MAX_IMAGES = 5


def _stream_from_logs(execution: Any, stream: str) -> str:
    logs = getattr(execution, "logs", None)
    if not logs:
        return ""
    raw = getattr(logs, stream, None) or []
    if isinstance(raw, str):
        return raw[:MAX_STDIO_CHARS]
    parts: list[str] = []
    for item in raw:
        if isinstance(item, str):
            text = item
        else:
            text = getattr(item, stream, None) or getattr(item, "line", None) or str(item)
        if text:
            parts.append(str(text))
    return "".join(parts)[:MAX_STDIO_CHARS]


def _stdout_from_logs(execution: Any) -> str:
    return _stream_from_logs(execution, "stdout")


def _stderr_from_logs(execution: Any) -> str:
    return _stream_from_logs(execution, "stderr")


def _images_from_execution(execution: Any) -> list[str]:
    images: list[str] = []
    for result in getattr(execution, "results", None) or []:
        png = getattr(result, "png", None)
        if png:
            images.append(str(png))
        if len(images) >= MAX_IMAGES:
            break
    return images


def _execution_to_dict(execution: Any, *, sandbox: str) -> dict[str, Any]:
    error = getattr(execution, "error", None)
    if error:
        return {
            "success": False,
            "sandbox": sandbox,
            "error_name": getattr(error, "name", None) or "Error",
            "error_value": str(getattr(error, "value", "") or ""),
            "traceback": str(getattr(error, "traceback", "") or "")[:MAX_STDIO_CHARS],
        }

    stdout = _stdout_from_logs(execution)
    stderr = _stderr_from_logs(execution)
    images = _images_from_execution(execution)
    result_text = getattr(execution, "text", None)
    if result_text is not None:
        result_text = str(result_text)[:MAX_STDIO_CHARS]

    return {
        "success": True,
        "sandbox": sandbox,
        "stdout": stdout,
        "stderr": stderr,
        "images": images,
        "result_text": result_text,
    }


def _create_e2b_sandbox(e2b_key: str) -> Any:
    """Create an E2B sandbox across SDK versions (v2 uses Sandbox.create)."""
    try:
        from e2b_code_interpreter import Sandbox
    except ImportError as e:
        raise RuntimeError(
            "e2b-code-interpreter is not installed. Run: pip install e2b-code-interpreter"
        ) from e

    if hasattr(Sandbox, "create"):
        try:
            return Sandbox.create(api_key=e2b_key)
        except TypeError:
            pass
    return Sandbox(api_key=e2b_key)


def run_python_code(code_string: str) -> dict[str, Any]:
    """One-shot execution — spins up and tears down an E2B sandbox."""
    e2b_key = (settings.E2B_API_KEY or "").strip()
    if not e2b_key:
        raise RuntimeError("E2B_API_KEY not configured")

    sandbox = _create_e2b_sandbox(e2b_key)
    try:
        execution = sandbox.run_code(code_string or "")
        return _execution_to_dict(execution, sandbox="e2b")
    except Exception as e:
        log.warning("sandbox.e2b_failed", error=str(e))
        return {
            "success": False,
            "sandbox": "e2b",
            "error_name": type(e).__name__,
            "error_value": str(e),
            "traceback": "",
            "stdout": "",
            "stderr": "",
            "images": [],
        }
    finally:
        try:
            sandbox.kill()
        except Exception:
            pass


async def run_python_code_piston(code_string: str, stdin: str = "") -> dict[str, Any]:
    """Stateless fallback when E2B is unavailable."""
    url = (settings.PISTON_API_URL or "https://emkc.org/api/v2").rstrip("/") + "/execute"
    payload = {
        "language": "python",
        "version": "3.10.0",
        "files": [{"name": "main.py", "content": code_string or ""}],
        "stdin": stdin or "",
        "run_timeout": 8000,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
    run = data.get("run") or {}
    stdout = str(run.get("stdout") or "")[:MAX_STDIO_CHARS]
    stderr = str(run.get("stderr") or "")[:MAX_STDIO_CHARS]
    code_out = int(run.get("code") or 0)
    return {
        "success": code_out == 0,
        "sandbox": "piston",
        "stdout": stdout,
        "stderr": stderr,
        "images": [],
        "result_text": None,
        "exit_code": code_out,
        "error_name": "ProcessError" if code_out != 0 else None,
        "error_value": stderr if code_out != 0 else None,
        "traceback": "",
    }


def slim_result_for_llm(data: dict[str, Any]) -> dict[str, Any]:
    """Strip heavy base64 payloads before sending tool output back to the LLM."""
    slim = dict(data)
    images = slim.get("images") or []
    if images:
        slim["images"] = [f"[chart {i + 1} rendered for the user]" for i in range(len(images))]
    return slim


def format_result_text(data: dict[str, Any]) -> str:
    """Human-readable summary when JSON string is shown in plain text UIs."""
    if not data.get("success"):
        parts = [
            f"Error: {data.get('error_name', 'Error')}",
            str(data.get("error_value") or ""),
        ]
        if data.get("traceback"):
            parts.append(str(data["traceback"]))
        return "\n".join(p for p in parts if p).strip() or "Execution failed."

    parts: list[str] = [f"sandbox={data.get('sandbox', 'unknown')}"]
    if data.get("stdout"):
        parts.append(f"stdout:\n{data['stdout']}")
    if data.get("stderr"):
        parts.append(f"stderr:\n{data['stderr']}")
    if data.get("result_text"):
        parts.append(f"result:\n{data['result_text']}")
    if data.get("images"):
        parts.append(f"charts: {len(data['images'])} image(s)")
    return "\n".join(parts)


class E2bSandboxSession:
    """Reuses one E2B sandbox (Jupyter kernel) for an entire agent turn."""

    def __init__(self) -> None:
        self._sandbox: Any | None = None
        self._available = bool((settings.E2B_API_KEY or "").strip())

    @property
    def available(self) -> bool:
        return self._available

    def run_code(self, code_string: str) -> dict[str, Any]:
        if not self._available:
            raise RuntimeError("E2B_API_KEY not configured")

        if self._sandbox is None:
            self._sandbox = _create_e2b_sandbox((settings.E2B_API_KEY or "").strip())

        try:
            execution = self._sandbox.run_code(code_string or "")
            return _execution_to_dict(execution, sandbox="e2b")
        except Exception as e:
            log.warning("sandbox.e2b_session_failed", error=str(e))
            return {
                "success": False,
                "sandbox": "e2b",
                "error_name": type(e).__name__,
                "error_value": str(e),
                "traceback": "",
                "stdout": "",
                "stderr": "",
                "images": [],
            }

    def close(self) -> None:
        if self._sandbox is None:
            return
        try:
            self._sandbox.kill()
        except Exception as e:
            log.warning("sandbox.e2b_close_failed", error=str(e))
        finally:
            self._sandbox = None

    def __enter__(self) -> E2bSandboxSession:
        return self

    def __exit__(self, *exc: Any) -> None:
        self.close()


def dumps_execution(data: dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=False)
