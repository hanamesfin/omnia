"""
Prompt task analyzer — NLP heuristics (extensible to LLM classifier later).

Produces a structured TaskAnalysis used by the Model Router.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import Any

# Extensible category registry: add new categories by appending patterns here.
TASK_CATEGORY_PATTERNS: dict[str, list[str]] = {
    "coding": [
        r"\b(code|python|typescript|javascript|react|next\.?js|api|function|class|module)\b",
        r"\b(implement|refactor|build|develop)\b.{0,30}\b(app|feature|endpoint)\b",
    ],
    "debugging": [r"\b(debug|stack trace|error|exception|fix bug|traceback)\b"],
    "ui_design": [r"\b(ui design|figma|layout|wireframe|component library)\b"],
    "ux_design": [r"\b(ux|user flow|usability|journey map)\b"],
    "full_stack": [r"\b(full[- ]?stack|frontend and backend|end[- ]?to[- ]?end)\b"],
    "backend": [r"\b(backend|server|database|postgres|redis|microservice)\b"],
    "frontend": [r"\b(frontend|react|vue|css|tailwind|html)\b"],
    "mobile": [r"\b(mobile|ios|android|swift|kotlin|flutter|react native)\b"],
    "devops": [r"\b(devops|kubernetes|docker|ci/cd|terraform|deploy)\b"],
    "architecture": [r"\b(architecture|system design|scalability|microservices)\b"],
    "writing": [r"\b(write|blog|essay|article|copy|draft|story)\b"],
    "marketing": [r"\b(marketing|campaign|seo|ads|landing page copy)\b"],
    "sales": [r"\b(sales|outreach|cold email|pitch deck|prospect)\b"],
    "legal": [r"\b(legal|contract|terms of service|compliance|gdpr|hipaa)\b"],
    "medical": [r"\b(medical|clinical|diagnosis|patient|hipaa)\b"],
    "finance": [r"\b(finance|financial|investment|portfolio|earnings|stock)\b"],
    "research": [r"\b(research|summarize|compare|cite|sources|literature)\b"],
    "data_analysis": [r"\b(data analysis|csv|spreadsheet|pandas|sql query|dashboard)\b"],
    "math": [r"\b(math|equation|calculus|statistics|probability|proof)\b"],
    "science": [r"\b(science|physics|chemistry|biology|experiment)\b"],
    "vision": [r"\b(image|screenshot|photo|ocr|vision|multimodal|chart)\b"],
    "translation": [r"\b(translate|translation|localize|language)\b"],
    "image_generation": [r"\b(generate image|create image|dall-?e|midjourney|illustration)\b"],
    "video_generation": [r"\b(generate video|video creation|sora|runway)\b"],
    "audio": [r"\b(audio|podcast|music|sound)\b"],
    "speech": [r"\b(speech|transcribe|voice|tts|stt)\b"],
    "automation": [r"\b(automate|workflow|cron|batch|pipeline|trigger)\b"],
    "agent_creation": [r"\b(ai agent|create agent|agent builder|autonomous)\b"],
    "document_analysis": [r"\b(document|pdf|docx|parse document)\b"],
    "pdf_analysis": [r"\b(pdf|scan|ocr pdf)\b"],
    "spreadsheet_analysis": [r"\b(excel|xlsx|spreadsheet|google sheets)\b"],
    "presentation": [r"\b(presentation|slides|powerpoint|deck)\b"],
    "brainstorming": [r"\b(brainstorm|ideas|ideate|creative session)\b"],
    "strategic_planning": [r"\b(strategy|roadmap|planning|okr|go to market)\b"],
    "reasoning": [r"\b(reason|prove|logic|step by step|think carefully)\b"],
    "web_search": [r"\b(search the web|google|latest news|current events|competitor)\b"],
}


@dataclass
class TaskAnalysis:
  """Structured output from prompt analysis — feeds the recommendation engine."""

  primary_task: str = "general"
  secondary_tasks: list[str] = field(default_factory=list)
  detected_categories: list[str] = field(default_factory=list)
  complexity: str = "medium"  # low | medium | high | expert
  reasoning_level: float = 0.5  # 0–1
  coding_difficulty: float = 0.0  # 0–1
  needs_vision: bool = False
  needs_image_generation: bool = False
  needs_web_search: bool = False
  needs_long_context: bool = False
  needs_structured_output: bool = False
  needs_tools: bool = False
  expected_speed: str = "balanced"  # fast | balanced | quality
  estimated_input_tokens: int = 0
  estimated_output_tokens: int = 512
  multi_task: bool = False
  subtask_hints: list[str] = field(default_factory=list)

  def to_dict(self) -> dict[str, Any]:
    return asdict(self)


def _match_categories(text: str) -> list[tuple[str, int]]:
  """Return (category, hit_count) sorted by relevance."""
  hits: list[tuple[str, int]] = []
  for category, patterns in TASK_CATEGORY_PATTERNS.items():
    count = 0
    for pat in patterns:
      count += len(re.findall(pat, text, flags=re.I))
    if count:
      hits.append((category, count))
  hits.sort(key=lambda x: x[1], reverse=True)
  return hits


def _estimate_complexity(text: str, categories: list[str]) -> str:
  length = len(text)
  multi = len(categories) >= 3 or " and then " in text or text.count(",") >= 4
  expert_kw = ("enterprise", "production", "scale", "security", "distributed", "million")
  if any(k in text for k in expert_kw) or length > 2500:
    return "expert"
  if multi or length > 1200 or "architecture" in categories:
    return "high"
  if length < 120:
    return "low"
  return "medium"


def _detect_subtasks(text: str) -> list[str]:
  """Split compound requests on connectors."""
  parts = re.split(
    r"\b(?:and then|then|after that|also|next|finally)\b",
    text,
    flags=re.I,
  )
  return [p.strip() for p in parts if len(p.strip()) > 12]


def analyze_prompt(
  prompt: str,
  *,
  domain: str = "general",
  constraints: list[str] | None = None,
  attachment_count: int = 0,
  has_images: bool = False,
) -> TaskAnalysis:
  """
  Analyze a user prompt and return structured task signals.
  Metadata-driven — extend TASK_CATEGORY_PATTERNS without changing router logic.
  """
  text = f"{domain} {prompt} {' '.join(constraints or [])}".strip().lower()
  categories = _match_categories(text)
  detected = [c for c, _ in categories]
  primary = detected[0] if detected else "general"
  secondary = detected[1:5]

  # Map fine categories → scorer task profiles
  profile_map = {
    "coding": "coding",
    "debugging": "coding",
    "full_stack": "coding",
    "backend": "coding",
    "frontend": "coding",
    "mobile": "coding",
    "devops": "coding",
    "architecture": "reasoning",
    "writing": "creative_writing",
    "marketing": "creative_writing",
    "sales": "creative_writing",
    "legal": "sensitive_data",
    "medical": "sensitive_data",
    "research": "research",
    "data_analysis": "coding",
    "math": "reasoning",
    "science": "research",
    "vision": "vision",
    "reasoning": "reasoning",
    "automation": "automation",
    "web_search": "research",
  }
  primary_profile = profile_map.get(primary, "general")

  coding_cats = {
    "coding", "debugging", "full_stack", "backend", "frontend",
    "mobile", "devops", "data_analysis",
  }
  coding_difficulty = min(1.0, sum(1 for c in detected if c in coding_cats) * 0.35 + (0.2 if "expert" in text else 0))

  reasoning_level = min(
    1.0,
    0.2
    + (0.3 if primary_profile == "reasoning" else 0)
    + (0.2 if "step by step" in text or "prove" in text else 0)
    + (0.15 if _estimate_complexity(text, detected) in ("high", "expert") else 0),
  )

  subtasks = _detect_subtasks(prompt)
  multi_task = len(subtasks) > 1 or len(detected) >= 4

  est_in = max(50, len(prompt.split()) * 2 + attachment_count * 800)
  needs_long = est_in > 8000 or "long document" in text or "entire book" in text

  speed = "balanced"
  if any(k in text for k in ("quick", "fast", "asap", "brief", "short answer")):
    speed = "fast"
  elif any(k in text for k in ("thorough", "detailed", "comprehensive", "deep dive")):
    speed = "quality"

  return TaskAnalysis(
    primary_task=primary_profile,
    secondary_tasks=secondary,
    detected_categories=detected,
    complexity=_estimate_complexity(text, detected),
    reasoning_level=round(reasoning_level, 3),
    coding_difficulty=round(coding_difficulty, 3),
    needs_vision=has_images or "vision" in detected or "ocr" in text or "screenshot" in text,
    needs_image_generation="image_generation" in detected,
    needs_web_search="web_search" in detected or "latest" in text or "current" in text,
    needs_long_context=needs_long,
    needs_structured_output=any(k in text for k in ("json", "schema", "structured", "table", "csv output")),
    needs_tools=multi_task or "web_search" in detected or coding_difficulty > 0.3,
    expected_speed=speed,
    estimated_input_tokens=est_in,
    estimated_output_tokens=1024 if _estimate_complexity(text, detected) in ("high", "expert") else 512,
    multi_task=multi_task,
    subtask_hints=subtasks if multi_task else [],
  )
