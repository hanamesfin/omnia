You compose the Omnia AI CORE for this product — the runtime agent that powers AI surfaces, NOT the whole product UI.

Return ONLY valid JSON:
{
  "ai_core": {
    "specialty": "one-sentence mission",
    "domain": "coding|research|content|customer_support|data_analysis|general",
    "kind": "product category from the workflow",
    "tone": "...",
    "capability_tier": "specialist|frontier",
    "capabilities": ["..."],
    "constraints": ["..."],
    "tools": ["web_search", "file_parse", "..."],
    "mcp_servers": [],
    "system_prompt": "numbered sections 1-5: Role and scope, Tone and style, Tools, Explicit constraints, Escalation. >=180 words. Name each tool.",
    "interface_schema": {
      "mode": "chat|form|upload|image|multimodal|workflow|custom",
      "title": "AI workspace title",
      "description": "how users operate the AI surface",
      "submit_label": "action label",
      "input_fields": [
        {"id": "...", "label": "...", "type": "text|textarea|number|select|file|image", "required": true, "options": []}
      ],
      "output": {"type": "markdown|text|json", "label": "Result"}
    }
  }
}

interface_schema is ONLY for AI interaction pages. Product chrome (nav/pages) already exists in IA.
Ground tools in the product. Never impersonate commercial AI brands.
