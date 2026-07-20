# Cursor AI integration

OMNIA coding agents can delegate multi-file work to [Cursor](https://cursor.com) via the official Python SDK (`cursor-sdk`).

## Setup

1. Install the SDK in the API environment:

```bash
cd omnia/apps/api
pip install cursor-sdk
```

2. Add a user or service-account key from [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations):

```bash
# apps/api/.env
CURSOR_API_KEY=cursor_...
CURSOR_DEFAULT_MODEL=composer-2.5
CURSOR_DEFAULT_RUNTIME=local
# CURSOR_DEFAULT_CWD=/absolute/path/to/repo   # optional
# CURSOR_RUN_TIMEOUT_SECONDS=600
```

3. Restart the API. Check **Menu → Cursor AI** or `GET /api/v1/integrations/cursor/status`.

## Surfaces

| Surface | Path |
|---|---|
| Status + try-prompt UI | `/integrations/cursor` |
| Status API | `GET /api/v1/integrations/cursor/status` |
| One-shot run | `POST /api/v1/integrations/cursor/prompt` |
| Agent tool | `cursor_agent` (aliases: `cursor`, `cursor_ai`) |

Coding-domain agents get `cursor_agent` in their default tool set.

## Tool arguments

```json
{
  "prompt": "Refactor auth middleware and add tests",
  "runtime": "local",
  "model": "composer-2.5",
  "cwd": "/optional/local/path"
}
```

Cloud:

```json
{
  "prompt": "Add structured logging to the API",
  "runtime": "cloud",
  "repo_url": "https://github.com/org/repo",
  "starting_ref": "main",
  "auto_create_pr": true
}
```

## Runtime notes

- **Local** — runs on the API host against `cwd` (default process cwd / `CURSOR_DEFAULT_CWD`).
- **Cloud** — Cursor-hosted VM; requires `repo_url`. Set `auto_create_pr` for PR creation.
- Failures distinguish **config/unavailable** (HTTP 400/503) from **run error** (`status: error` in the body).
- Dispose is handled inside the integration wrapper (`AsyncClient` + agent context managers).

## Defense one-liner

“Coding agents don’t invent patches in a vacuum — they can hand the task to Cursor’s agent runtime with the same local/cloud model our developers use, under a typed tool contract.”
