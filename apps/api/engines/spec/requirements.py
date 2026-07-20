"""
Strict domain model for Create-interview requirements, including MCP routing.
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


# Logical capability names the Architect may emit → resolved against MCP_SERVERS_JSON
KNOWN_MCP_CAPABILITIES = (
    "web_scraper",
    "sql_db",
    "github",
    "slack",
    "drive",
    "notion",
    "email",
    "none",
)


class AgentInputField(BaseModel):
    id: str = Field(description="Stable field id")
    label: str = Field(default="", description="User-facing label")
    type: str = Field(default="text", description="Input widget type")
    required: bool = True
    options: list[str] = Field(default_factory=list)
    placeholder: str | None = None
    accept: str | None = None


class AgentOutput(BaseModel):
    type: str = Field(default="markdown", description="Result format")
    label: str = Field(default="Result", description="Result label")


class AgentRequirements(BaseModel):
    """What the interview LLM extracted — used to provision UI + MCP connections."""

    purpose: str = Field(default="", description="The core objective of the agent.")
    target_user: str = Field(default="", description="Who will use this agent.")
    experience: str = Field(
        default="",
        description="UI / product experience (chat, form, upload, dashboard, …).",
        alias="interface_shape",
    )
    input_fields: list[AgentInputField] = Field(
        default_factory=list,
        description="Required fields the user must fill out.",
    )
    output: AgentOutput = Field(
        default_factory=AgentOutput,
        description="How the final result is delivered.",
        alias="output_format",
    )
    tools: list[str] = Field(
        default_factory=list,
        description="Builtin runtime tools (web_search, code_execute, …).",
    )
    mcp_servers: list[str] = Field(
        default_factory=list,
        description=(
            "Required external MCP capabilities. "
            "Options include: web_scraper, sql_db, github, slack, drive, notion, email, none."
        ),
    )
    capabilities: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)

    model_config = {"populate_by_name": True, "extra": "allow"}

    @field_validator("mcp_servers", mode="before")
    @classmethod
    def _normalize_mcp(cls, value: Any) -> list[str]:
        if value is None or value == "":
            return []
        if isinstance(value, str):
            value = [value]
        if not isinstance(value, list):
            return []
        out: list[str] = []
        for item in value:
            name = str(item).strip().lower().replace(" ", "_").replace("-", "_")
            if not name or name == "none":
                continue
            if name not in out:
                out.append(name)
        return out

    @field_validator("input_fields", mode="before")
    @classmethod
    def _coerce_fields(cls, value: Any) -> list[Any]:
        if not value:
            return []
        if isinstance(value, list) and value and isinstance(value[0], str):
            return [
                {"id": f"field_{i}", "label": label, "type": "text", "required": True}
                for i, label in enumerate(value)
            ]
        return value

    @field_validator("output", mode="before")
    @classmethod
    def _coerce_output(cls, value: Any) -> Any:
        if isinstance(value, str):
            return {"type": value, "label": "Result"}
        return value or {"type": "markdown", "label": "Result"}

    def to_store(self) -> dict[str, Any]:
        data = self.model_dump(by_alias=False)
        # Keep both experience and interface_shape for UI compatibility
        data["interface_shape"] = self.experience
        data["output_format"] = self.output.type
        return data

    @classmethod
    def from_store(cls, raw: dict[str, Any] | None) -> AgentRequirements:
        if not isinstance(raw, dict):
            return cls()
        payload = dict(raw)
        if "experience" not in payload and payload.get("interface_shape"):
            payload["experience"] = payload["interface_shape"]
        if "output" not in payload and payload.get("output_format"):
            payload["output"] = payload["output_format"]
        try:
            return cls.model_validate(payload)
        except Exception:
            return cls(
                purpose=str(payload.get("purpose") or ""),
                target_user=str(payload.get("target_user") or ""),
                experience=str(payload.get("experience") or payload.get("interface_shape") or ""),
            )
