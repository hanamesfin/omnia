"""
Runtime tool definitions for structured LLM tool calling.
Each tool has a JSON Schema the model sees and a stable runtime id.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

PermissionTier = Literal["read_only", "side_effecting", "destructive"]

# Aliases from agent specs / frontier / architect prompts → canonical runtime id.
TOOL_ALIASES: dict[str, str] = {
    "search": "web_search",
    "web_search": "web_search",
    "tavily": "web_search",
    "serp": "web_search",
    "web_fetch": "web_fetch",
    "fetch_url": "web_fetch",
    "code_execution": "code_execute",
    "code_execute": "code_execute",
    "sandbox": "code_execute",
    "e2b": "code_execute",
    "file_read": "file_parse",
    "file_parse": "file_parse",
    "csv_reader": "file_parse",
    "http_request": "http_request",
    "calculator": "code_execute",
    "browser": "browser_automation",
    "browser_automation": "browser_automation",
    "playwright": "browser_automation",
    "browserbase": "browser_automation",
    "memory": "memory_search",
    "memory_recall": "memory_search",
    "memory_search": "memory_search",
    "rag": "memory_search",
    "knowledge_search": "knowledge_search",
    "knowledge": "knowledge_search",
    "doc_search": "knowledge_search",
    "mcp": "mcp_call",
    "mcp_call": "mcp_call",
    "mcp_email_client": "mcp_call",
    "translate": "translate",
    "google_translate": "translate",
    "translation": "translate",
    "send_email": "send_email",
    "email": "send_email",
    "resend": "send_email",
    "cursor_agent": "cursor_agent",
    "cursor": "cursor_agent",
    "cursor_ai": "cursor_agent",
    "cursor_sdk": "cursor_agent",
}


@dataclass(frozen=True)
class RuntimeTool:
    tool_id: str
    description: str
    permission_tier: PermissionTier
    input_schema: dict[str, Any]
    enterprise_label: str = ""

    def openai_definition(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.tool_id,
                "description": self.description,
                "parameters": self.input_schema,
            },
        }


RUNTIME_TOOLS: dict[str, RuntimeTool] = {
    "web_search": RuntimeTool(
        tool_id="web_search",
        enterprise_label="Grounding / live search",
        description=(
            "Search the live web (Tavily/Brave). Use for research, competitors, "
            "prices, docs — anything past the training cutoff."
        ),
        permission_tier="read_only",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "count": {
                    "type": "integer",
                    "description": "Number of results (1-10)",
                    "minimum": 1,
                    "maximum": 10,
                },
            },
            "required": ["query"],
        },
    ),
    "web_fetch": RuntimeTool(
        tool_id="web_fetch",
        enterprise_label="URL fetch / scrape text",
        description=(
            "Fetch a public URL and return cleaned text (no full browser). "
            "Use after search when you need the page body."
        ),
        permission_tier="read_only",
        input_schema={
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "HTTPS URL to fetch"},
                "max_chars": {
                    "type": "integer",
                    "description": "Max characters to return",
                    "minimum": 500,
                    "maximum": 50000,
                },
            },
            "required": ["url"],
        },
    ),
    "file_parse": RuntimeTool(
        tool_id="file_parse",
        enterprise_label="Document / spreadsheet parse",
        description=(
            "Extract text from an uploaded PDF, DOCX, CSV, XLSX, or text file. "
            "Use attachment_id from the upload, or 'latest'."
        ),
        permission_tier="read_only",
        input_schema={
            "type": "object",
            "properties": {
                "attachment_id": {
                    "type": "string",
                    "description": "Upload id, or 'latest'",
                },
            },
            "required": ["attachment_id"],
        },
    ),
    "code_execute": RuntimeTool(
        tool_id="code_execute",
        enterprise_label="Secure code sandbox",
        description=(
            "Execute Python in a stateful Jupyter notebook cell (E2B Firecracker micro-VM "
            "when configured, else Piston). Use for math, algorithms, pandas, matplotlib "
            "charts, and file transforms — never guess numbers. Variables persist between "
            "calls in the same turn."
        ),
        permission_tier="side_effecting",
        input_schema={
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "Raw Python code to execute in the sandbox cell",
                },
                "stdin": {"type": "string", "description": "Optional stdin (Piston fallback only)"},
            },
            "required": ["code"],
        },
    ),
    "http_request": RuntimeTool(
        tool_id="http_request",
        enterprise_label="Generic HTTP / API caller",
        description=(
            "Call an external HTTP API. Prefer MCP when an MCP server covers the service. "
            "GET is read-only; POST/PUT/DELETE change remote state."
        ),
        permission_tier="side_effecting",
        input_schema={
            "type": "object",
            "properties": {
                "url": {"type": "string"},
                "method": {
                    "type": "string",
                    "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"],
                },
                "headers": {"type": "object", "additionalProperties": {"type": "string"}},
                "body": {"description": "JSON body for POST/PUT/PATCH"},
            },
            "required": ["url", "method"],
        },
    ),
    "browser_automation": RuntimeTool(
        tool_id="browser_automation",
        enterprise_label="Headless browser worker",
        description=(
            "Control a headless browser (Browserbase/Playwright) to navigate pages, "
            "click, fill forms, and scrape when no API exists. Never submit irreversible "
            "actions without explicit user confirmation in the same turn."
        ),
        permission_tier="side_effecting",
        input_schema={
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "Starting URL"},
                "actions": {
                    "type": "array",
                    "description": "Ordered actions: goto, click, type, extract, screenshot",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {
                                "type": "string",
                                "enum": ["goto", "click", "type", "extract", "wait"],
                            },
                            "selector": {"type": "string"},
                            "value": {"type": "string"},
                            "url": {"type": "string"},
                        },
                    },
                },
                "extract_text": {
                    "type": "boolean",
                    "description": "Return visible page text after actions",
                },
            },
            "required": ["url"],
        },
    ),
    "memory_search": RuntimeTool(
        tool_id="memory_search",
        enterprise_label="Long-term / RAG memory",
        description=(
            "Search this agent's long-term conversational memory (past notes). "
            "Use for preferences and prior session facts — not uploaded document RAG."
        ),
        permission_tier="read_only",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "What to retrieve"},
                "top_k": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 10,
                },
            },
            "required": ["query"],
        },
    ),
    "knowledge_search": RuntimeTool(
        tool_id="knowledge_search",
        enterprise_label="Document knowledge RAG",
        description=(
            "Semantic search over documents uploaded for this agent (SOPs, brand guides, "
            "datasets). Call this before answering questions that may be grounded in the corpus."
        ),
        permission_tier="read_only",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "What to look up in the knowledge base"},
                "top_k": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 10,
                    "description": "Number of chunks to return",
                },
            },
            "required": ["query"],
        },
    ),
    "mcp_call": RuntimeTool(
        tool_id="mcp_call",
        enterprise_label="MCP (enterprise integrations)",
        description=(
            "Call a tool on a configured Model Context Protocol server "
            "(GitHub, Slack, Drive, Notion, etc.). Prefer this over raw http_request "
            "when an MCP server is available for the service."
        ),
        permission_tier="side_effecting",
        input_schema={
            "type": "object",
            "properties": {
                "server": {
                    "type": "string",
                    "description": "MCP server name from MCP_SERVERS_JSON",
                },
                "tool": {"type": "string", "description": "Tool name on that server"},
                "arguments": {"type": "object", "description": "Tool arguments"},
            },
            "required": ["server", "tool"],
        },
    ),
    "translate": RuntimeTool(
        tool_id="translate",
        enterprise_label="Google Translate",
        description=(
            "Translate text with Google Cloud Translation. Use when the user writes in "
            "another language, needs a localized reply, or asks to translate content. "
            "Pass target as a BCP-47 code (en, es, fr, ar, zh, ja, …). Optional source "
            "language; omit to auto-detect."
        ),
        permission_tier="read_only",
        input_schema={
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text to translate"},
                "target": {
                    "type": "string",
                    "description": "Target language code (e.g. en, es, ar, zh-CN)",
                },
                "source": {
                    "type": "string",
                    "description": "Source language code, or omit / 'auto' to detect",
                },
            },
            "required": ["text", "target"],
        },
    ),
    "send_email": RuntimeTool(
        tool_id="send_email",
        enterprise_label="Email via Resend",
        description=(
            "Send an email through the configured Resend account. This is irreversible: "
            "the authenticated user must explicitly confirm the send before this tool executes."
        ),
        permission_tier="destructive",
        input_schema={
            "type": "object",
            "properties": {
                "to": {
                    "oneOf": [
                        {"type": "string"},
                        {"type": "array", "items": {"type": "string"}, "maxItems": 20},
                    ],
                    "description": "Recipient email address or addresses",
                },
                "subject": {"type": "string"},
                "html": {"type": "string", "description": "HTML email body"},
                "text": {"type": "string", "description": "Plain-text email body"},
                "cc": {
                    "oneOf": [
                        {"type": "string"},
                        {"type": "array", "items": {"type": "string"}, "maxItems": 20},
                    ]
                },
                "reply_to": {"type": "string"},
            },
            "required": ["to", "subject"],
        },
    ),
    "cursor_agent": RuntimeTool(
        tool_id="cursor_agent",
        enterprise_label="Cursor AI coding agent",
        description=(
            "Delegate a coding task to Cursor AI (official SDK). Use for multi-file refactors, "
            "bug fixes, tests, and PRs. runtime=local edits the workspace on this machine; "
            "runtime=cloud clones repo_url on a Cursor VM (set auto_create_pr=true to open a PR). "
            "Requires CURSOR_API_KEY. Prefer a clear, scoped prompt."
        ),
        permission_tier="side_effecting",
        input_schema={
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Task for the Cursor agent (be specific about files and acceptance criteria)",
                },
                "runtime": {
                    "type": "string",
                    "enum": ["local", "cloud"],
                    "description": "local (default) or cloud",
                },
                "model": {
                    "type": "string",
                    "description": "Cursor model id (default composer-2.5)",
                },
                "cwd": {
                    "type": "string",
                    "description": "Local workspace path (local runtime only)",
                },
                "repo_url": {
                    "type": "string",
                    "description": "GitHub HTTPS URL (required for cloud)",
                },
                "starting_ref": {
                    "type": "string",
                    "description": "Branch or SHA for cloud clone (default main)",
                },
                "auto_create_pr": {
                    "type": "boolean",
                    "description": "Cloud only — open a PR when the run finishes",
                },
            },
            "required": ["prompt"],
        },
    ),
}


# Text block injected into Create / interview architect prompts.
ARCHITECT_TOOL_CATALOG = """\
Available runtime tools (pick only what the product needs — these become the agent's hands):
- web_search — live internet search (Tavily/Brave)
- web_fetch — pull cleaned text from a URL
- file_parse — read PDF/DOCX/CSV/XLSX uploads
- code_execute — run Python in a secure sandbox (E2B/Piston); real compute, not guessed math
- http_request — generic HTTP to declared APIs
- browser_automation — headless browser for sites without APIs (click/fill/scrape)
- memory_search — conversational long-term memory notes
- knowledge_search — semantic search over uploaded Enterprise knowledge documents
- translate — Google Cloud Translation (localize text; target language codes like en/es/ar)
- send_email — send a confirmed email through Resend (always requires explicit user approval)
- cursor_agent — Cursor AI coding agent (local workspace or cloud repo / PR)
- mcp_call — enterprise MCP integrations when configured
- mcp_call — Model Context Protocol bridge (legacy single-shot)

MCP servers (external capabilities — credentials stay on the customer's server):
- web_scraper — fetch/clean public pages + extract links (built-in Omnia MCP server)
- sql_db — private SQL (customer-hosted MCP)
- github — repos/issues/PRs (customer-hosted MCP)
- slack / drive / notion / email — workspace integrations (customer-hosted MCP)
- none — no MCP needed

Put MCP names in requirements.mcp_servers (not only in tools). At run time Omnia
spins up MCP clients, lists tools, and exposes them as mcp__server__tool functions.

Examples:
- "track competitor prices on websites + email Friday" → tools: browser_automation, web_fetch; mcp_servers: [email]
- "scrape competitor landing pages weekly" → tools: web_search; mcp_servers: [web_scraper]
- "analyze this CSV for sales trends" → tools: file_parse, code_execute
- "research X and cite sources" → tools: web_search, web_fetch
- "read my resume and match jobs" → tools: file_parse, web_search
- "translate customer emails to English" → tools: translate
- "refactor auth middleware and open a PR" → tools: cursor_agent (runtime=cloud, repo_url, auto_create_pr)
"""


def normalize_tool_id(tool_id: str) -> str:
    key = tool_id.strip().lower().replace(" ", "_").replace("-", "_")
    return TOOL_ALIASES.get(key, key)


def normalize_tools_list(raw: list[Any] | None) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in raw:
        tid = normalize_tool_id(str(item))
        if tid in RUNTIME_TOOLS and tid not in seen:
            seen.add(tid)
            out.append(tid)
    return out


def tools_for_agent(attached: list[str]) -> list[RuntimeTool]:
    """Resolve attached tool ids (with aliases) to runtime definitions."""
    out: list[RuntimeTool] = []
    seen: set[str] = set()
    for raw in attached:
        tid = normalize_tool_id(raw)
        if tid in seen or tid not in RUNTIME_TOOLS:
            continue
        seen.add(tid)
        out.append(RUNTIME_TOOLS[tid])
    return out


def openai_tool_definitions(attached: list[str]) -> list[dict[str, Any]]:
    return [t.openai_definition() for t in tools_for_agent(attached)]


def tool_labels(attached: list[str]) -> list[dict[str, str]]:
    return [
        {
            "id": t.tool_id,
            "label": t.enterprise_label or t.tool_id,
            "tier": t.permission_tier,
        }
        for t in tools_for_agent(attached)
    ]
