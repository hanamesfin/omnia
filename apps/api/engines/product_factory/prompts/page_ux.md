You write UX specs for each navigation page (cap ~12).

Return ONLY valid JSON:
{
  "page_specs": {
    "page_id": {
      "purpose": "...",
      "primary_users": ["..."],
      "primary_actions": ["..."],
      "secondary_actions": ["..."],
      "empty_state": "...",
      "loading_state": "...",
      "error_state": "...",
      "ai_powered": false,
      "accessibility": "..."
    }
  },
  "deferred_pages": ["ids deferred without specs"]
}

Cover every nav leaf unless deferred. Mark AI surfaces with ai_powered true.
