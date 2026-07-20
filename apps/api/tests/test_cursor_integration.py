"""Cursor AI integration helpers."""
from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

from engines.integrations.cursor_agent import (
    CursorRunResult,
    cursor_status,
    run_cursor_prompt,
)
from engines.tools.runtime_registry import normalize_tool_id


def test_cursor_tool_alias():
    assert normalize_tool_id("cursor") == "cursor_agent"
    assert normalize_tool_id("cursor_ai") == "cursor_agent"


def test_cursor_status_shape():
    status = cursor_status()
    assert "configured" in status
    assert "api_key_set" in status
    assert "sdk_installed" in status
    assert "default_model" in status
    assert "hint" in status


def test_run_cursor_prompt_requires_prompt():
    result = asyncio.run(run_cursor_prompt(""))
    assert result.status == "config_error"


def test_run_cursor_prompt_cloud_needs_repo():
    with patch("engines.integrations.cursor_agent.cursor_sdk_installed", return_value=True):
        with patch("engines.integrations.cursor_agent.cursor_api_key", return_value="crsr_test"):
            result = asyncio.run(run_cursor_prompt("fix auth", runtime="cloud"))
    assert result.status == "config_error"
    assert "repo_url" in (result.error or "")


def test_run_cursor_prompt_success_mocked():
    fake = CursorRunResult(
        status="finished",
        text="Done.",
        agent_id="agent-1",
        run_id="run-1",
        runtime="local",
        model="composer-2.5",
    )
    with patch("engines.integrations.cursor_agent.cursor_sdk_installed", return_value=True):
        with patch("engines.integrations.cursor_agent.cursor_api_key", return_value="crsr_test"):
            with patch(
                "engines.integrations.cursor_agent._run_async",
                new=AsyncMock(return_value=fake),
            ):
                result = asyncio.run(run_cursor_prompt("Summarize the repo", runtime="local"))
    assert result.status == "finished"
    assert "Done" in result.to_tool_output()
