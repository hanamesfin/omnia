"""Load specialist instruction files and heuristic fallbacks."""

from __future__ import annotations

from pathlib import Path
from typing import Any

_PROMPTS = Path(__file__).resolve().parent / "prompts"


def load_prompt(phase_id: str) -> str:
    path = _PROMPTS / f"{phase_id}.md"
    if not path.exists():
        path = _PROMPTS / "critic.md"
    return path.read_text(encoding="utf-8")


def critic_prompt() -> str:
    return load_prompt("critic")


def heuristic_phase(phase_id: str, workspace: dict[str, Any], *, name: str, transcript: str) -> dict[str, Any]:
    """Deterministic fallback when LLM unavailable — still product-specific from keywords."""
    text = f"{name}\n{transcript}\n{workspace.get('daily_workflow') or ''}".lower()
    family = _infer_family(text)

    if phase_id == "classify":
        return {
            "product_type": family["product_type"],
            "platform": "web",
            "ai_core_role": family["ai_core_role"],
            "daily_workflow": family["daily_workflow"],
        }
    if phase_id == "strategy":
        return {
            "problem_worth_solving": family["problem"],
            "uvp": family["uvp"],
            "target_users": family["users"],
            "market_notes": family["market"],
        }
    if phase_id == "prd":
        return {
            "prd": {
                "purpose": family["uvp"],
                "goals": family["goals"],
                "functional_requirements": family["fr"],
                "non_functional_requirements": [
                    "Secure by default",
                    "Accessible WCAG 2.1 AA",
                    "Responsive web",
                ],
                "constraints": family["constraints"],
                "success_metrics": family["metrics"],
            }
        }
    if phase_id == "ia":
        return {
            "information_architecture": {
                "pages": family["pages"],
                "nav": [{"id": p["id"], "label": p["label"]} for p in family["pages"]],
            },
            "deferred_pages": family.get("deferred", []),
        }
    if phase_id == "design_system":
        return {"design_system": family["design_system"]}
    if phase_id == "page_ux":
        specs = {}
        for p in family["pages"]:
            specs[p["id"]] = {
                "purpose": p.get("description") or p["label"],
                "primary_users": family["users"][:1],
                "primary_actions": p.get("actions") or [f"Open {p['label']}"],
                "secondary_actions": ["Share", "Export"],
                "empty_state": f"No {p['label'].lower()} yet — get started.",
                "loading_state": "Loading…",
                "error_state": "Something went wrong. Retry.",
                "ai_powered": bool(p.get("ai_powered")),
                "accessibility": "Keyboard navigable; labeled controls",
            }
        return {"page_specs": specs}
    if phase_id == "architecture":
        return {
            "architecture": {
                "modules": family["modules"],
                "entities": family["entities"],
                "integrations": family["integrations"],
                "ai_core_integration": family["ai_integration"],
            }
        }
    if phase_id == "ai_core":
        return {
            "ai_core": {
                "specialty": family["uvp"],
                "domain": family["domain"],
                "kind": family["kind"],
                "tone": family["tone"],
                "capability_tier": "specialist",
                "capabilities": family["goals"][:4],
                "constraints": family["constraints"],
                "tools": family["tools"],
                "mcp_servers": [],
                "system_prompt": family["system_prompt"],
                "interface_schema": family["interface_schema"],
            }
        }
    return {}


def _infer_family(text: str) -> dict[str, Any]:
    if any(k in text for k in ("job", "resume", "cv", "interview", "career", "hiring")):
        return _job_family()
    if any(k in text for k in ("medical", "patient", "clinic", "health", "prescription", "lab result")):
        return _medical_family()
    if any(k in text for k in ("code", "repo", "pull request", "developer", "ide", "deploy")):
        return _coding_family()
    if any(k in text for k in ("travel", "trip", "itinerary", "flight", "hotel")):
        return _travel_family()
    return _generic_saas_family()


def _job_family() -> dict[str, Any]:
    pages = [
        {"id": "home", "label": "Home", "ai_powered": False, "description": "Overview of search progress", "actions": ["Continue search"]},
        {"id": "applications", "label": "Applications", "ai_powered": False, "description": "Track submissions", "actions": ["Add application", "Update status"]},
        {"id": "resume_lab", "label": "Resume Lab", "ai_powered": True, "description": "Tailor resumes with AI", "actions": ["Tailor resume", "Export PDF"]},
        {"id": "interview_prep", "label": "Interview Prep", "ai_powered": True, "description": "Practice interviews", "actions": ["Start mock interview"]},
        {"id": "analytics", "label": "Analytics", "ai_powered": False, "description": "Funnel metrics", "actions": ["View conversion"]},
        {"id": "integrations", "label": "Integrations", "ai_powered": False, "description": "Job boards & calendars", "actions": ["Connect board"]},
        {"id": "knowledge", "label": "Knowledge", "ai_powered": False, "description": "Company notes", "actions": ["Add note"]},
        {"id": "settings", "label": "Settings", "ai_powered": False, "description": "Preferences", "actions": ["Save"]},
    ]
    return {
        "product_type": "saas",
        "ai_core_role": "Tailor applications, score fits, and coach interviews from the candidate profile.",
        "daily_workflow": "Scan openings, tailor materials, apply, track status, prep interviews, review analytics.",
        "problem": "Job seekers waste hours rewriting materials and lose track of applications.",
        "uvp": "An end-to-end job search product that turns a profile into tracked, tailored applications.",
        "users": ["Active job seeker", "Career coach"],
        "market": "Competes with generic boards by owning the full application workflow.",
        "goals": ["Increase interview rate", "Reduce time-to-apply", "Centralize tracking"],
        "fr": [
            "Capture candidate profile and preferences",
            "Tailor resume/cover letter per role",
            "Track application pipeline stages",
            "Generate interview prep from job description",
        ],
        "constraints": ["Never invent employment history", "Confirm before submitting externally"],
        "metrics": ["Applications per week", "Interview conversion", "Time to tailor materials"],
        "pages": pages,
        "deferred": ["billing", "blog"],
        "design_system": {
            "personality": "focused_momentum",
            "emotional_goals": ["confidence", "clarity"],
            "references": ["Linear", "Ashby"],
            "tokens": {
                "colors": {
                    "bg": "#0f1419",
                    "fg": "#e7ecf3",
                    "accent": "#3dd6c6",
                    "muted": "#8b9bb4",
                    "border": "#243044",
                    "surface": "#172033",
                },
                "typography": {"font_display": "Space Grotesk", "font_sans": "IBM Plex Sans"},
                "spacing": {"unit": "4px", "section": "3rem"},
                "radius": "0.5rem",
                "motion": {"enter": "fade-up 180ms", "emphasis": "accent pulse 300ms"},
                "shadow": "subtle",
            },
        },
        "modules": ["Profile", "Applications", "ResumeLab", "InterviewCoach", "Analytics"],
        "entities": ["Candidate", "JobPosting", "Application", "ResumeVersion", "InterviewSession"],
        "integrations": ["LinkedIn", "Calendar", "Email"],
        "ai_integration": "Resume Lab and Interview Prep pages call the Omnia AI core; Applications stay CRUD.",
        "domain": "content",
        "kind": "job_search",
        "tone": "precise and encouraging",
        "tools": ["web_search", "file_parse", "web_fetch"],
        "system_prompt": _long_prompt(
            "Job Search AI Core",
            "Help candidates tailor materials and prepare interviews without inventing facts.",
            ["web_search", "file_parse", "web_fetch"],
        ),
        "interface_schema": {
            "mode": "form",
            "title": "Resume Lab",
            "description": "Provide role and materials to tailor",
            "submit_label": "Tailor",
            "input_fields": [
                {"id": "job_description", "label": "Job description", "type": "textarea", "required": True, "options": []},
                {"id": "resume", "label": "Current resume", "type": "file", "required": True, "options": []},
                {"id": "tone", "label": "Tone", "type": "select", "required": False, "options": ["Concise", "Confident", "Warm"]},
            ],
            "output": {"type": "markdown", "label": "Tailored materials"},
        },
    }


def _medical_family() -> dict[str, Any]:
    pages = [
        {"id": "patients", "label": "Patients", "ai_powered": False, "description": "Patient roster", "actions": ["Open chart"]},
        {"id": "history", "label": "Medical History", "ai_powered": False, "description": "Longitudinal record", "actions": ["Add entry"]},
        {"id": "reports", "label": "Reports", "ai_powered": True, "description": "AI draft clinical summaries", "actions": ["Draft report"]},
        {"id": "labs", "label": "Lab Results", "ai_powered": False, "description": "Structured labs", "actions": ["Import labs"]},
        {"id": "appointments", "label": "Appointments", "ai_powered": False, "description": "Schedule", "actions": ["Book"]},
        {"id": "prescriptions", "label": "Prescriptions", "ai_powered": False, "description": "Rx list", "actions": ["Renew"]},
        {"id": "compliance", "label": "Compliance", "ai_powered": False, "description": "Policies & audits", "actions": ["View audit"]},
        {"id": "audit_logs", "label": "Audit Logs", "ai_powered": False, "description": "Access trail", "actions": ["Filter"]},
    ]
    return {
        "product_type": "enterprise_tool",
        "ai_core_role": "Draft clinician-facing summaries and triage notes under compliance constraints.",
        "daily_workflow": "Review patients, check labs, draft reports, manage appointments, log prescriptions, audit access.",
        "problem": "Clinicians drown in documentation while needing strict auditability.",
        "uvp": "A clinical workspace where AI drafts reports inside a compliant patient product — not a naked chat.",
        "users": ["Clinician", "Clinic admin"],
        "market": "HIPAA-aware documentation assistants paired with full chart navigation.",
        "goals": ["Reduce documentation time", "Preserve audit trails", "Keep humans in the loop"],
        "fr": [
            "Patient roster and chart navigation",
            "Lab result review",
            "AI-assisted report drafting with citations to chart data",
            "Immutable audit logging",
        ],
        "constraints": ["No autonomous diagnosis", "Human approval before chart write-back", "PHI minimization"],
        "metrics": ["Doc time per visit", "Report edit distance", "Audit completeness"],
        "pages": pages,
        "deferred": ["billing", "telehealth"],
        "design_system": {
            "personality": "clinical_trust",
            "emotional_goals": ["calm", "trust", "clarity"],
            "references": ["Epic simplicity", "Apple Health restraint"],
            "tokens": {
                "colors": {
                    "bg": "#f7f9fb",
                    "fg": "#1a2b3c",
                    "accent": "#0b6e4f",
                    "muted": "#5b6b7c",
                    "border": "#d5dee7",
                    "surface": "#ffffff",
                },
                "typography": {"font_display": "Source Serif 4", "font_sans": "Source Sans 3"},
                "spacing": {"unit": "4px", "section": "2.5rem"},
                "radius": "0.35rem",
                "motion": {"enter": "fade 160ms", "emphasis": "none"},
                "shadow": "none",
            },
        },
        "modules": ["Patients", "Charts", "Reports", "Labs", "Compliance"],
        "entities": ["Patient", "Encounter", "LabResult", "ReportDraft", "AuditEvent"],
        "integrations": ["EHR FHIR", "Lab vendor"],
        "ai_integration": "Reports page invokes AI core with chart context; write-back requires clinician confirm.",
        "domain": "customer_support",
        "kind": "clinical_assistant",
        "tone": "calm clinical",
        "tools": ["file_parse", "memory_search"],
        "system_prompt": _long_prompt(
            "Clinical Report AI Core",
            "Draft summaries from provided chart context. Never invent labs or diagnoses.",
            ["file_parse", "memory_search"],
        ),
        "interface_schema": {
            "mode": "form",
            "title": "Draft clinical report",
            "description": "Attach chart excerpts for a draft summary",
            "submit_label": "Draft",
            "input_fields": [
                {"id": "encounter_notes", "label": "Encounter notes", "type": "textarea", "required": True, "options": []},
                {"id": "lab_bundle", "label": "Lab PDF/CSV", "type": "file", "required": False, "options": []},
            ],
            "output": {"type": "markdown", "label": "Draft report"},
        },
    }


def _coding_family() -> dict[str, Any]:
    pages = [
        {"id": "repositories", "label": "Repositories", "ai_powered": False, "description": "Connected repos", "actions": ["Connect repo"]},
        {"id": "workspaces", "label": "Workspaces", "ai_powered": False, "description": "Active branches", "actions": ["Open workspace"]},
        {"id": "pull_requests", "label": "Pull Requests", "ai_powered": True, "description": "AI review assist", "actions": ["Review PR"]},
        {"id": "docs", "label": "Documentation", "ai_powered": True, "description": "Generate docs", "actions": ["Draft docs"]},
        {"id": "deployments", "label": "Deployments", "ai_powered": False, "description": "Release status", "actions": ["View deploy"]},
        {"id": "terminal", "label": "Terminal", "ai_powered": False, "description": "Command surface", "actions": ["Run"]},
        {"id": "models", "label": "Models", "ai_powered": False, "description": "Model routing", "actions": ["Pick model"]},
        {"id": "plugins", "label": "Plugins", "ai_powered": False, "description": "Extensions", "actions": ["Install"]},
        {"id": "team", "label": "Team", "ai_powered": False, "description": "Collaboration", "actions": ["Invite"]},
    ]
    return {
        "product_type": "ide",
        "ai_core_role": "Review code, draft docs, and propose patches inside the developer workspace.",
        "daily_workflow": "Open repos, work in workspaces, review PRs, check deploys, consult docs, collaborate.",
        "problem": "Dev teams context-switch across tools while AI stays stuck in a chat sidebar.",
        "uvp": "A developer platform where agents live next to repos, PRs, and deploys.",
        "users": ["Software engineer", "Tech lead"],
        "market": "IDE-adjacent agent products with workflow-native surfaces.",
        "goals": ["Faster PR review", "Better docs coverage", "Fewer context switches"],
        "fr": [
            "Connect repositories",
            "AI-assisted PR review",
            "Documentation generation from code",
            "Deployment status visibility",
        ],
        "constraints": ["Never force-push", "Diffs require human merge", "Secrets stay redacted"],
        "metrics": ["PR cycle time", "Doc coverage", "Accepted suggestions"],
        "pages": pages,
        "deferred": ["marketplace", "billing"],
        "design_system": {
            "personality": "terminal_precision",
            "emotional_goals": ["speed", "focus"],
            "references": ["Cursor", "Raycast", "Vercel"],
            "tokens": {
                "colors": {
                    "bg": "#0b0d10",
                    "fg": "#e6edf3",
                    "accent": "#f97316",
                    "muted": "#9aa4b2",
                    "border": "#21262d",
                    "surface": "#12161c",
                },
                "typography": {"font_display": "JetBrains Mono", "font_sans": "IBM Plex Sans"},
                "spacing": {"unit": "4px", "section": "2rem"},
                "radius": "0.25rem",
                "motion": {"enter": "slide 120ms", "emphasis": "accent underline"},
                "shadow": "none",
            },
        },
        "modules": ["Repos", "PRReview", "Docs", "Deploy", "Plugins"],
        "entities": ["Repository", "Workspace", "PullRequest", "Deployment", "Plugin"],
        "integrations": ["GitHub", "CI", "Container registry"],
        "ai_integration": "Pull Requests and Documentation pages call AI core with repo context.",
        "domain": "coding",
        "kind": "dev_platform",
        "tone": "terse and precise",
        "tools": ["code_execute", "web_fetch", "file_parse"],
        "system_prompt": _long_prompt(
            "Coding Agent Core",
            "Review code and draft docs. Propose patches; never claim merges without tools.",
            ["code_execute", "web_fetch", "file_parse"],
        ),
        "interface_schema": {
            "mode": "form",
            "title": "PR review assist",
            "description": "Paste diff or PR URL for review",
            "submit_label": "Review",
            "input_fields": [
                {"id": "diff", "label": "Diff / PR context", "type": "textarea", "required": True, "options": []},
                {"id": "focus", "label": "Focus", "type": "select", "required": False, "options": ["Security", "Performance", "Tests"]},
            ],
            "output": {"type": "markdown", "label": "Review notes"},
        },
    }


def _travel_family() -> dict[str, Any]:
    pages = [
        {"id": "trips", "label": "Trips", "ai_powered": False, "description": "Trip list", "actions": ["New trip"]},
        {"id": "itineraries", "label": "Itineraries", "ai_powered": True, "description": "Day plans", "actions": ["Generate day"]},
        {"id": "maps", "label": "Maps", "ai_powered": False, "description": "Spatial view", "actions": ["Open map"]},
        {"id": "bookings", "label": "Bookings", "ai_powered": False, "description": "Reservations", "actions": ["Add booking"]},
        {"id": "budgets", "label": "Budgets", "ai_powered": False, "description": "Spend tracking", "actions": ["Set budget"]},
        {"id": "collaborate", "label": "Collaborate", "ai_powered": False, "description": "Shared planning", "actions": ["Invite"]},
        {"id": "recommendations", "label": "Recommendations", "ai_powered": True, "description": "AI suggestions", "actions": ["Suggest"]},
    ]
    return {
        "product_type": "saas",
        "ai_core_role": "Build itineraries and recommendations from preferences and constraints.",
        "daily_workflow": "Plan trips, shape itineraries, check maps, manage bookings and budgets, collaborate, refine recommendations.",
        "problem": "Travel planning scatters across tabs without a coherent product spine.",
        "uvp": "A trip product where AI fills itineraries inside real trip, map, and budget workflows.",
        "users": ["Leisure traveler", "Trip organizer"],
        "market": "Planner apps with agentic itinerary generation.",
        "goals": ["Faster itinerary drafts", "Budget adherence", "Collaborative planning"],
        "fr": ["Trip CRUD", "AI itinerary generation", "Budget tracking", "Shared collaboration"],
        "constraints": ["Disclose estimates vs bookings", "No silent purchases"],
        "metrics": ["Itinerary acceptance", "Budget variance"],
        "pages": pages,
        "deferred": ["offline_mode", "blog"],
        "design_system": {
            "personality": "wanderlust_clarity",
            "emotional_goals": ["inspiration", "ease"],
            "references": ["Airbnb", "Polarsteps"],
            "tokens": {
                "colors": {
                    "bg": "#fff8f1",
                    "fg": "#1f2a24",
                    "accent": "#e85d04",
                    "muted": "#6b7c72",
                    "border": "#eadfce",
                    "surface": "#ffffff",
                },
                "typography": {"font_display": "Fraunces", "font_sans": "Nunito Sans"},
                "spacing": {"unit": "4px", "section": "3rem"},
                "radius": "1rem",
                "motion": {"enter": "fade-up 220ms", "emphasis": "soft bounce"},
                "shadow": "subtle",
            },
        },
        "modules": ["Trips", "Itinerary", "Maps", "Budget", "Collab"],
        "entities": ["Trip", "DayPlan", "Booking", "Budget", "Collaborator"],
        "integrations": ["Maps", "Flight search"],
        "ai_integration": "Itineraries and Recommendations call AI core; Bookings remain manual confirm.",
        "domain": "general",
        "kind": "travel_planner",
        "tone": "warm and practical",
        "tools": ["web_search", "web_fetch"],
        "system_prompt": _long_prompt(
            "Travel Planner AI Core",
            "Propose itineraries from constraints. Separate suggestions from confirmed bookings.",
            ["web_search", "web_fetch"],
        ),
        "interface_schema": {
            "mode": "form",
            "title": "Build itinerary",
            "description": "Destination, dates, and preferences",
            "submit_label": "Plan",
            "input_fields": [
                {"id": "destination", "label": "Destination", "type": "text", "required": True, "options": []},
                {"id": "dates", "label": "Dates", "type": "text", "required": True, "options": []},
                {"id": "budget", "label": "Budget", "type": "number", "required": False, "options": []},
                {"id": "vibe", "label": "Vibe", "type": "select", "required": False, "options": ["Relaxed", "Adventure", "Food"]},
            ],
            "output": {"type": "markdown", "label": "Itinerary"},
        },
    }


def _generic_saas_family() -> dict[str, Any]:
    pages = [
        {"id": "workspace", "label": "Workspace", "ai_powered": True, "description": "Primary AI work surface", "actions": ["Run"]},
        {"id": "projects", "label": "Projects", "ai_powered": False, "description": "Project list", "actions": ["New project"]},
        {"id": "library", "label": "Library", "ai_powered": False, "description": "Assets & files", "actions": ["Upload"]},
        {"id": "insights", "label": "Insights", "ai_powered": False, "description": "Usage analytics", "actions": ["View"]},
        {"id": "integrations", "label": "Integrations", "ai_powered": False, "description": "Connected tools", "actions": ["Connect"]},
        {"id": "team", "label": "Team", "ai_powered": False, "description": "Members", "actions": ["Invite"]},
        {"id": "settings", "label": "Settings", "ai_powered": False, "description": "Preferences", "actions": ["Save"]},
    ]
    return {
        "product_type": "saas",
        "ai_core_role": "Perform the product's core AI workflow inside a dedicated workspace.",
        "daily_workflow": "Open projects, run AI workspace tasks, manage library assets, review insights, configure integrations.",
        "problem": "Users need a full product around the AI capability, not a lone chat box.",
        "uvp": "A purpose-built product shell around a specialized AI workspace.",
        "users": ["Primary operator", "Team admin"],
        "market": "Vertical AI SaaS with workflow navigation.",
        "goals": ["Complete core jobs faster", "Keep work organized by project"],
        "fr": ["Project organization", "AI workspace runs", "Asset library", "Team access"],
        "constraints": ["Confirm destructive actions", "Respect data boundaries"],
        "metrics": ["Tasks completed", "Return usage"],
        "pages": pages,
        "deferred": ["blog", "careers"],
        "design_system": {
            "personality": "editorial_utility",
            "emotional_goals": ["clarity", "competence"],
            "references": ["Notion", "Stripe"],
            "tokens": {
                "colors": {
                    "bg": "#f8fafc",
                    "fg": "#0f172a",
                    "accent": "#0f766e",
                    "muted": "#64748b",
                    "border": "#e2e8f0",
                    "surface": "#ffffff",
                },
                "typography": {"font_display": "Fraunces", "font_sans": "DM Sans"},
                "spacing": {"unit": "4px", "section": "3rem"},
                "radius": "0.6rem",
                "motion": {"enter": "fade 180ms", "emphasis": "underline accent"},
                "shadow": "subtle",
            },
        },
        "modules": ["Projects", "Workspace", "Library", "Insights"],
        "entities": ["Project", "Run", "Asset", "Member"],
        "integrations": ["Webhooks", "File storage"],
        "ai_integration": "Workspace page hosts the Omnia AI core; other pages are product chrome.",
        "domain": "general",
        "kind": "custom",
        "tone": "clear",
        "tools": ["web_search", "file_parse"],
        "system_prompt": _long_prompt(
            "Product AI Core",
            "Execute the product mission from user inputs. Stay within scope.",
            ["web_search", "file_parse"],
        ),
        "interface_schema": {
            "mode": "chat",
            "title": "Workspace",
            "description": "Chat with the product AI",
            "submit_label": "Send",
            "input_fields": [],
            "output": {"type": "markdown", "label": "Reply"},
        },
    }


def _long_prompt(name: str, mission: str, tools: list[str]) -> str:
    tool_line = ", ".join(tools) if tools else "none"
    return (
        f"1. Role and scope\nYou are {name}. {mission} "
        "Operate only within the product mission and refuse out-of-scope requests with a clear escalation. "
        "Prefer concrete, verifiable outputs over vague advice. "
        "When evidence is thin, say so explicitly instead of inventing facts.\n\n"
        "2. Tone and style\nBe clear, specific, and respectful of the user's time. "
        "Use short sections and actionable next steps. Match the product's domain language.\n\n"
        f"3. Tools and when to use each\nYou may use: {tool_line}. "
        "Call tools before claiming external facts. Never fabricate tool results. "
        "If a tool fails, explain the failure and offer a manual path.\n\n"
        "4. Explicit constraints\nDo not impersonate other commercial AI brands. "
        "Do not exfiltrate secrets. Confirm before irreversible actions. "
        "Keep outputs grounded in provided inputs and retrieved context.\n\n"
        "5. Escalation rule\nIf the request requires legal, medical, or safety-critical authority "
        "beyond your scope, stop and escalate to a human with the missing decision criteria. "
        "Detail and care matter for reliable agent behavior across long workflows."
    )
