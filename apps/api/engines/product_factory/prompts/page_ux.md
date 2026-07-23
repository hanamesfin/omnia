You write UX specs for each navigation page (cap ~12).

Product UI language = **Collections App** (standalone blank canvas):
- Soft gray canvas (`#f4f4f4`), white content surfaces, black primary actions
- Page titles: large light editorial display type (Platypi); meta/counts in IBM Plex Mono
- Filters: horizontal mono labels with underline ink indicator — use class `product-app-filter` / `product-app-filter-item` (not chip spam)
- Lists/grids: generous gutters (~20px), soft media radius (~6px via `product-app-media`), card radius (~12px via `product-app-card`)
- Empty states: calm one-sentence copy + one primary action (`product-app-btn-primary`)
- No OMNIA chrome; product nav is the bottom frosted pill

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
Keep empty/loading copy product-specific — not generic "no data yet" templates.
