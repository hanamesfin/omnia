"""
Match a user prompt to the best-fitting Figma template / style board.

Portable techniques from Sonary top AI app builders (Base44, Emergent, Lovable)
plus v0 / Relume / Galileo:

  Base44 — Function + Layout + Mood triad; paint the screen; borrow named apps;
           Plan-mode structured brief before build
  Emergent — Who/why + named screens; clarifying questions when visual open;
           reference sites + hex/radius in first prompt; multi-agent design agent
  Lovable — Top-3 design directions when visually open-ended; curated font/palette/
           layout questions; skip guidance when fonts/colors/URLs/named systems clear;
           aesthetic buzzwords (minimal, cinematic, playful, premium)

Omnia mapping:
  - Offline intent classifier → archetype + layout_intent + mood + reference_apps
  - Catalog retrieval over domain/archetype/style/layout/vibe (+ optional embeddings)
  - Multi-factor score with anti-pattern penalties (no generic purple/Inter AI look)
  - Top-K candidates as Lovable-style design_directions
  - Style brief injection for design_system / vision codegen
  - Never force Collections/Trove unless archetype is gallery_curation
"""

from __future__ import annotations

import math
import re
from typing import Any

# ---------------------------------------------------------------------------
# Seed catalog — richer metadata even when file_keys are placeholders.
# Replace PLACEHOLDER_* file_keys when real Figma frames are catalogued.
# ---------------------------------------------------------------------------

SEED_TEMPLATES: list[dict[str, Any]] = [
    {
        "id": "collections_curation",
        "file_key": "dismXXnVXKBKDmUrzz7FVE",
        "node_id": "0:1",
        "domain": "curation",
        "product_archetype": "gallery_curation",
        "style_tags": ["editorial", "minimal", "calm", "soft_gray", "masonry"],
        "layout_pattern": "masonry_feed_bottom_nav",
        "vibe": "quiet personal canvas for collecting and arranging inspiration",
        "description": (
            "Collections App / Trove — soft gray canvas, centered brand, frosted bottom pill nav, "
            "editorial display type, white content surfaces, black primary actions, curated collections grid"
        ),
        "reference_urls": [
            "https://godly.website",
            "https://www.siteinspire.com",
            "https://mobbin.com",
        ],
        "reference_descriptors": [
            "Trove/Collections calm masonry feed with frosted bottom pill",
            "Siteinspire editorial galleries — soft gray, restrained type",
        ],
        "anti_patterns": ["purple_gradient", "inter_default", "card_spam_dashboard", "neon_glow"],
        "design_tokens": {
            "bg": "#f4f4f4",
            "fg": "#000000",
            "surface": "#ffffff",
            "muted": "#999999",
            "font_display": "Platypi",
            "font_sans": "Host Grotesk",
            "nav": "bottom_pill",
        },
        "keywords": [
            "collection",
            "curation",
            "gallery",
            "library",
            "editorial",
            "trove",
            "catalog",
            "bookmark",
            "save",
            "aesthetic",
            "masonry",
            "moodboard",
        ],
        "seed": True,
    },
    {
        "id": "saas_workspace",
        "file_key": "PLACEHOLDER_saas_workspace",
        "node_id": "0:1",
        "domain": "saas",
        "product_archetype": "b2b_workspace",
        "style_tags": ["minimal", "productive", "neutral", "sidebar_dense"],
        "layout_pattern": "workspace_sidebar_list_detail",
        "vibe": "focused B2B productivity — Linear/Notion restraint, not startup flash",
        "description": (
            "Vertical SaaS workspace — project list, AI work surface, library assets, "
            "insights analytics, integrations, team settings"
        ),
        "reference_urls": [
            "https://linear.app",
            "https://www.notion.so",
            "https://saaspages.xyz",
        ],
        "reference_descriptors": [
            "Linear density with quiet neutrals and sharp hierarchy",
            "Notion restraint — whitespace, muted ink, no purple chrome",
        ],
        "anti_patterns": ["purple_gradient", "glassmorphism_overload", "hero_marketing_first"],
        "design_tokens": {
            "bg": "#f7f6f3",
            "fg": "#111111",
            "accent": "#2563eb",
            "surface": "#ffffff",
            "nav": "bottom_pill",
        },
        "keywords": [
            "saas",
            "workspace",
            "project",
            "dashboard",
            "team",
            "integration",
            "insights",
            "productivity",
            "crm",
            "pipeline",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "booking_scheduler",
        "file_key": "PLACEHOLDER_booking_scheduler",
        "node_id": "0:1",
        "domain": "scheduling",
        "product_archetype": "booking_scheduler",
        "style_tags": ["calm", "clarity", "calendar_first", "conversion"],
        "layout_pattern": "calendar_slots_confirm",
        "vibe": "appointment clarity — calendar-led slots, calm confirmations, service picker",
        "description": (
            "Booking / scheduling — service picker, open time slots, calendar, "
            "confirmations, staff assignment, no double-booking"
        ),
        "reference_urls": [
            "https://cal.com",
            "https://calendly.com",
            "https://mobbin.com",
        ],
        "reference_descriptors": [
            "Cal.com slot picker with calm service hierarchy and confirm step",
            "Calendly-style booking — calendar first, frictionless confirm",
        ],
        "anti_patterns": ["purple_gradient", "dense_dashboard", "marketplace_grid", "neon_glow"],
        "design_tokens": {
            "bg": "#f6f5f2",
            "fg": "#1a1a1a",
            "accent": "#0f766e",
            "surface": "#ffffff",
            "font_display": "Literata",
            "font_sans": "Source Sans 3",
            "nav": "bottom_pill",
        },
        "keywords": [
            "booking",
            "appointment",
            "schedule",
            "calendar",
            "time slot",
            "reservation",
            "availability",
            "book a",
            "scheduling",
            "consult",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "clinical_trust",
        "file_key": "PLACEHOLDER_clinical_trust",
        "node_id": "0:1",
        "domain": "healthcare",
        "product_archetype": "clinical_ops",
        "style_tags": ["trust", "calm", "accessible", "high_contrast", "clinical"],
        "layout_pattern": "roster_detail_timeline",
        "vibe": "clinical trust — calm greens, clear hierarchy, zero decorative noise",
        "description": (
            "Clinical product chrome — patient roster, labs, appointments, prescriptions, "
            "compliance audit trail, calm trust palette"
        ),
        "reference_urls": [
            "https://mobbin.com",
            "https://www.awwwards.com",
        ],
        "reference_descriptors": [
            "Calm clinical roster with high-contrast status and trust greens",
            "Accessible medical ops UI — dense but readable, no playful accents",
        ],
        "anti_patterns": ["purple_gradient", "playful_illustration", "neon_glow", "brutalist"],
        "design_tokens": {
            "bg": "#f2f5f4",
            "fg": "#1a2b3c",
            "accent": "#0b6e4f",
            "nav": "bottom_pill",
        },
        "keywords": [
            "medical",
            "patient",
            "clinic",
            "health",
            "lab",
            "prescription",
            "hipaa",
            "clinical",
            "ehr",
            "doctor",
            "hospital",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "dev_platform",
        "file_key": "PLACEHOLDER_dev_platform",
        "node_id": "0:1",
        "domain": "coding",
        "product_archetype": "developer_platform",
        "style_tags": ["terminal", "monospace", "dense", "dark_ink", "keyboard_first"],
        "layout_pattern": "repo_list_pr_diff",
        "vibe": "developer speed — monospace meta, orange heat accents, keyboard-first",
        "description": (
            "Developer platform — repositories, pull requests, deployments, terminal, "
            "docs generation, plugin surface"
        ),
        "reference_urls": [
            "https://github.com",
            "https://raycast.com",
            "https://cursor.com",
        ],
        "reference_descriptors": [
            "GitHub PR density with monospace meta and sharp status chips",
            "Raycast/Cursor keyboard-first chrome — speed over decoration",
        ],
        "anti_patterns": ["soft_gray_editorial", "purple_gradient", "rounded_full_pills_everywhere"],
        "design_tokens": {
            "bg": "#eceae6",
            "fg": "#0b0d10",
            "accent": "#e8590c",
            "font_mono": "IBM Plex Mono",
            "font_display": "Space Grotesk",
            "nav": "bottom_pill",
        },
        "keywords": [
            "code",
            "repo",
            "pull request",
            "developer",
            "ide",
            "deploy",
            "github",
            "terminal",
            "ci",
            "pr",
            "commit",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "job_search",
        "file_key": "PLACEHOLDER_job_search",
        "node_id": "0:1",
        "domain": "career",
        "product_archetype": "career_pipeline",
        "style_tags": ["confident", "clarity", "warm_neutral", "pipeline"],
        "layout_pattern": "kanban_pipeline_forms",
        "vibe": "focused momentum — warm paper neutrals, navy accent, coaching clarity",
        "description": (
            "Job search product — applications pipeline, resume lab, interview prep, "
            "analytics funnel, career coaching"
        ),
        "reference_urls": [
            "https://linear.app",
            "https://www.tealhq.com",
            "https://saaspages.xyz",
        ],
        "reference_descriptors": [
            "TealHQ-style application pipeline with confident navy accents",
            "Linear-like clarity for career progress — no generic AI purple",
        ],
        "anti_patterns": ["purple_gradient", "glassmorphism_overload", "inter_default"],
        "design_tokens": {
            "bg": "#f3f1ec",
            "fg": "#0c1222",
            "accent": "#1d4e89",
            "font_display": "Fraunces",
            "font_sans": "DM Sans",
            "nav": "bottom_pill",
        },
        "keywords": [
            "job",
            "resume",
            "cv",
            "interview",
            "career",
            "hiring",
            "application",
            "candidate",
            "recruit",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "travel_planner",
        "file_key": "PLACEHOLDER_travel_planner",
        "node_id": "0:1",
        "domain": "travel",
        "product_archetype": "trip_planner",
        "style_tags": ["wanderlust", "airy", "map_first", "editorial_travel"],
        "layout_pattern": "itinerary_map_split",
        "vibe": "wanderlust clarity — airy greens, map-led itineraries, trip storytelling",
        "description": (
            "Travel planner — trips, itineraries, maps, bookings, budgets, collaborative planning"
        ),
        "reference_urls": [
            "https://www.awwwards.com",
            "https://lapa.ninja",
            "https://godly.website",
        ],
        "reference_descriptors": [
            "Map-led itinerary with airy greens and trip storytelling hierarchy",
            "Godly travel sites — photography-forward, calm booking chrome",
        ],
        "anti_patterns": ["dense_dashboard", "purple_gradient", "terminal_dark"],
        "design_tokens": {
            "bg": "#f1f4f1",
            "fg": "#1f2a24",
            "accent": "#2d6a4f",
            "nav": "bottom_pill",
        },
        "keywords": [
            "travel",
            "trip",
            "itinerary",
            "flight",
            "hotel",
            "booking",
            "map",
            "vacation",
            "tour",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "marketplace_commerce",
        "file_key": "PLACEHOLDER_marketplace_commerce",
        "node_id": "0:1",
        "domain": "commerce",
        "product_archetype": "marketplace",
        "style_tags": ["commerce", "product_grid", "trust_badges", "conversion"],
        "layout_pattern": "product_grid_filters_cart",
        "vibe": "commerce clarity — product-first grids, trust signals, conversion hierarchy",
        "description": (
            "Marketplace / e-commerce — product grid, filters, seller profiles, cart, checkout, reviews"
        ),
        "reference_urls": [
            "https://www.siteinspire.com",
            "https://lapa.ninja",
            "https://saaspages.xyz",
        ],
        "reference_descriptors": [
            "Product-grid marketplace with strong filter rail and trust badges",
            "Editorial commerce — photography-led cards, clear price hierarchy",
        ],
        "anti_patterns": ["purple_gradient", "dashboard_kpi_spam", "terminal_dark"],
        "design_tokens": {
            "bg": "#faf8f5",
            "fg": "#1a1a1a",
            "accent": "#c45c26",
            "font_display": "Cormorant Garamond",
            "font_sans": "Outfit",
            "nav": "bottom_pill",
        },
        "keywords": [
            "marketplace",
            "ecommerce",
            "e-commerce",
            "shop",
            "store",
            "product",
            "cart",
            "checkout",
            "seller",
            "buyer",
            "listing",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "chat_companion",
        "file_key": "PLACEHOLDER_chat_companion",
        "node_id": "0:1",
        "domain": "chat",
        "product_archetype": "conversational_agent",
        "style_tags": ["conversational", "soft", "message_first", "intimate"],
        "layout_pattern": "chat_thread_composer",
        "vibe": "intimate conversation — message-first, soft surfaces, quiet chrome",
        "description": (
            "Chat / companion product — thread list, message composer, memory panel, soft conversational UI"
        ),
        "reference_urls": [
            "https://mobbin.com",
            "https://www.awwwards.com",
        ],
        "reference_descriptors": [
            "Message-first companion with soft bubbles and quiet side memory",
            "Intimate chat chrome — composer-led, minimal navigation",
        ],
        "anti_patterns": ["dense_dashboard", "marketplace_grid", "purple_gradient"],
        "design_tokens": {
            "bg": "#f5f3ef",
            "fg": "#1c1917",
            "accent": "#0f766e",
            "font_display": "Literata",
            "font_sans": "Source Sans 3",
            "nav": "bottom_pill",
        },
        "keywords": [
            "chat app",
            "companion",
            "conversation",
            "messaging",
            "chatbot",
            "thread",
            "dm",
            "message composer",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "analytics_dashboard",
        "file_key": "PLACEHOLDER_analytics_dashboard",
        "node_id": "0:1",
        "domain": "analytics",
        "product_archetype": "data_dashboard",
        "style_tags": ["data_dense", "charts", "kpi", "neutral_pro"],
        "layout_pattern": "kpi_grid_charts_filters",
        "vibe": "neutral professional analytics — KPI strip, chart grid, filter bar, no fluff",
        "description": (
            "Analytics dashboard — KPI cards, trend charts, cohort tables, filters, export"
        ),
        "reference_urls": [
            "https://saaspages.xyz",
            "https://mobbin.com",
        ],
        "reference_descriptors": [
            "KPI strip + chart grid with disciplined filter bar",
            "Neutral pro analytics — data density without purple AI chrome",
        ],
        "anti_patterns": ["marketing_hero", "editorial_masonry", "playful_illustration"],
        "design_tokens": {
            "bg": "#f4f5f7",
            "fg": "#0f172a",
            "accent": "#0284c7",
            "font_display": "IBM Plex Sans",
            "font_sans": "IBM Plex Sans",
            "nav": "bottom_pill",
        },
        "keywords": [
            "analytics",
            "metrics",
            "kpi",
            "chart",
            "dashboard",
            "cohort",
            "funnel",
            "reporting",
            "bi",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "portfolio_editorial",
        "file_key": "PLACEHOLDER_portfolio_editorial",
        "node_id": "0:1",
        "domain": "portfolio",
        "product_archetype": "portfolio_showcase",
        "style_tags": ["editorial", "expressive", "typography_led", "showcase"],
        "layout_pattern": "case_study_scroll",
        "vibe": "editorial portfolio — typography-led case studies, bold whitespace, showcase",
        "description": (
            "Portfolio / personal brand — case studies, project grid, about, contact, expressive type"
        ),
        "reference_urls": [
            "https://godly.website",
            "https://www.siteinspire.com",
            "https://www.awwwards.com",
            "https://lapa.ninja",
        ],
        "reference_descriptors": [
            "Godly/Awwwards editorial portfolio — type-led case study scroll",
            "Siteinspire showcase — bold whitespace, photography as hero",
        ],
        "anti_patterns": ["saas_sidebar", "kpi_spam", "purple_gradient", "inter_default"],
        "design_tokens": {
            "bg": "#f8f6f1",
            "fg": "#121212",
            "accent": "#111111",
            "font_display": "Playfair Display",
            "font_sans": "Neue Montreal",
            "nav": "bottom_pill",
        },
        "keywords": [
            "portfolio",
            "showcase",
            "case study",
            "designer",
            "creative",
            "agency",
            "personal brand",
            "photography",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "fintech_ledger",
        "file_key": "PLACEHOLDER_fintech_ledger",
        "node_id": "0:1",
        "domain": "finance",
        "product_archetype": "fintech_ops",
        "style_tags": ["trust", "precision", "ledger", "cool_neutral"],
        "layout_pattern": "balances_transactions_charts",
        "vibe": "financial trust — cool neutrals, precise numbers, ledger clarity",
        "description": (
            "Fintech / banking — balances, transactions, budgets, transfers, statements"
        ),
        "reference_urls": [
            "https://mobbin.com",
            "https://saaspages.xyz",
        ],
        "reference_descriptors": [
            "Ledger-first fintech — cool neutrals, tabular numbers, trust hierarchy",
            "Banking clarity — balances up top, transaction list, no playful chrome",
        ],
        "anti_patterns": ["playful_illustration", "purple_gradient", "brutalist", "neon_glow"],
        "design_tokens": {
            "bg": "#f0f2f5",
            "fg": "#0b1320",
            "accent": "#0e7490",
            "font_display": "Libre Franklin",
            "font_sans": "Manrope",
            "nav": "bottom_pill",
        },
        "keywords": [
            "finance",
            "fintech",
            "banking",
            "budget",
            "transaction",
            "payment",
            "invoice",
            "ledger",
            "wallet",
            "money",
        ],
        "seed": True,
        "placeholder": True,
    },
    {
        "id": "learning_lms",
        "file_key": "PLACEHOLDER_learning_lms",
        "node_id": "0:1",
        "domain": "education",
        "product_archetype": "learning_platform",
        "style_tags": ["friendly", "progress", "course_cards", "encouraging"],
        "layout_pattern": "course_list_lesson_player",
        "vibe": "encouraging learning — progress rings, course cards, clear lesson player",
        "description": (
            "Learning / LMS — courses, lessons, progress, quizzes, certificates"
        ),
        "reference_urls": [
            "https://mobbin.com",
            "https://lapa.ninja",
        ],
        "reference_descriptors": [
            "Course-card LMS with clear progress and lesson player focus",
            "Encouraging education UI — friendly accents, never clinical or terminal",
        ],
        "anti_patterns": ["terminal_dark", "clinical_cold", "purple_gradient"],
        "design_tokens": {
            "bg": "#f7f4ef",
            "fg": "#1c1917",
            "accent": "#c2410c",
            "font_display": "Newsreader",
            "font_sans": "Figtree",
            "nav": "bottom_pill",
        },
        "keywords": [
            "learning",
            "course",
            "lesson",
            "lms",
            "education",
            "quiz",
            "tutor",
            "student",
            "curriculum",
        ],
        "seed": True,
        "placeholder": True,
    },
]

# Archetype detection rules: (archetype, keywords)
_ARCHETYPE_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("gallery_curation", ("collection", "curation", "curated", "trove", "moodboard", "masonry", "bookmark gallery")),
    ("career_pipeline", ("job", "resume", "cv", "interview", "career", "hiring", "recruit")),
    ("clinical_ops", ("medical", "patient", "clinic", "health", "ehr", "prescription", "hospital", "doctor")),
    ("developer_platform", ("code", "repo", "pull request", "developer", "ide", "deploy", "github", "ci/cd", "terminal")),
    ("trip_planner", ("travel", "trip", "itinerary", "flight", "hotel", "vacation", "tour")),
    ("marketplace", ("marketplace", "ecommerce", "e-commerce", "shop", "storefront", "cart", "checkout", "seller")),
    ("conversational_agent", ("chatbot", "chat companion", "messaging app", "dm thread", "conversation agent")),
    ("data_dashboard", ("analytics", "kpi", "metrics dashboard", "cohort", "bi tool", "reporting")),
    ("portfolio_showcase", ("portfolio", "case study", "personal brand", "showcase site", "agency site")),
    ("fintech_ops", ("fintech", "banking", "budget", "transaction", "invoice", "wallet", "payments")),
    ("learning_platform", ("learning", "course", "lms", "lesson", "quiz", "tutor", "curriculum")),
    ("booking_scheduler", ("booking", "appointment", "schedule", "time slot", "calendar booking", "reservation", "availability", "book a")),
    ("b2b_workspace", ("saas", "workspace", "crm", "project management", "team productivity", "pipeline")),
]

# Base44 layout axis — how things sit on screen
_LAYOUT_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("grid_of_cards", ("grid of cards", "card grid", "cards in a grid", "feature cards")),
    ("one_long_scroll", ("long scroll", "single page", "landing scroll", "one long page")),
    ("split_screen", ("split screen", "split-screen", "two column", "two-column", "side by side")),
    ("kanban_pipeline_forms", ("kanban", "drag between columns", "pipeline board", "trello")),
    ("calendar_slots_confirm", ("calendar", "time slot", "open slots", "availability picker")),
    ("chat_thread_composer", ("chat thread", "message composer", "conversation thread")),
    ("masonry_feed_bottom_nav", ("masonry", "pinterest style", "staggered grid")),
    ("workspace_sidebar_list_detail", ("sidebar", "list detail", "master detail")),
    ("kpi_grid_charts_filters", ("kpi", "chart grid", "metrics strip")),
    ("product_grid_filters_cart", ("product grid", "shop grid", "filter rail")),
    ("itinerary_map_split", ("map split", "map-led", "itinerary map")),
    ("case_study_scroll", ("case study scroll", "portfolio scroll")),
    ("repo_list_pr_diff", ("pr diff", "pull request view", "repo list")),
    ("course_list_lesson_player", ("lesson player", "course list")),
    ("bento_grid", ("bento", "bento grid", "asymmetric grid")),
]

# Base44 visual style / Lovable aesthetic buzzwords → mood
_MOOD_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("calm_professional", ("calm and professional", "calm professional", "soft colors", "plenty of white space", "uncluttered")),
    ("bold_playful", ("bold and playful", "playful", "bright colors", "friendly icons", "confetti")),
    ("sleek_premium", ("sleek and premium", "premium", "high-end", "elegant", "dark background", "cinematic")),
    ("minimal", ("minimal", "restrained", "quiet", "notion-like", "as calm as notion")),
    ("expressive", ("expressive", "bold typography", "creative", "disruptive")),
    ("developer_focused", ("developer-focused", "keyboard-first", "terminal", "dense code")),
    ("warm_earthy", ("warm and earthy", "warm earthy", "oatmeal", "paper neutrals")),
    ("cool_calm", ("cool and calm", "cool calm", "muted teal")),
]

# "Borrow from apps you already like" (Base44) / named product references
_REFERENCE_APP_RULES: list[tuple[str, tuple[str, ...], tuple[str, ...]]] = [
    # (label, prompt phrases, boost template ids)
    ("notion", ("like notion", "feel like notion", "as calm as notion", "notion-like", "as notion", "uncluttered as notion"), ("saas_workspace", "chat_companion")),
    ("linear", ("like linear", "feel like linear", "linear-like", "linear density", "as linear"), ("saas_workspace", "job_search", "dev_platform")),
    ("trello", ("like trello", "trello-style", "organize it like trello", "as trello"), ("job_search", "saas_workspace")),
    ("duolingo", ("like duolingo", "duolingo", "as duolingo"), ("learning_lms",)),
    ("github", ("like github", "github-style", "as github"), ("dev_platform",)),
    ("cal.com", ("like cal.com", "like calendly", "calendly-style", "as calendly", "feel like calendly"), ("booking_scheduler",)),
    ("stripe", ("like stripe", "stripe-like", "as stripe"), ("fintech_ledger", "saas_workspace")),
    ("airbnb", ("like airbnb", "airbnb-style", "as airbnb"), ("travel_planner", "marketplace_commerce")),
    ("godly", ("like godly", "godly.website", "as godly"), ("portfolio_editorial", "collections_curation")),
]

_STYLE_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("minimal", ("minimal", "clean", "simple", "restrained", "quiet")),
    ("editorial", ("editorial", "magazine", "typography", "serif")),
    ("brutalist", ("brutalist", "raw", "harsh", "mono grid")),
    ("glass", ("glass", "glassmorphism", "frosted", "blur")),
    ("calm", ("calm", "soft", "serene", "gentle")),
    ("terminal", ("terminal", "monospace", "cli", "hacker", "keyboard")),
    ("trust", ("trust", "secure", "professional", "enterprise")),
    ("wanderlust", ("wanderlust", "travel vibe", "adventure", "explor")),
    ("expressive", ("expressive", "bold", "playful", "creative", "vibrant")),
    ("data_dense", ("dense", "data-heavy", "analytics heavy", "kpi")),
    ("commerce", ("commerce", "shoppable", "conversion")),
    ("conversational", ("conversational", "chatty", "intimate")),
    ("warm_neutral", ("warm", "paper", "cream", "oatmeal")),
    ("dark_ink", ("dark mode", "dark ink", "near black")),
    ("premium", ("premium", "high-end", "luxury", "sleek")),
    ("playful", ("playful", "friendly", "fun")),
    ("cinematic", ("cinematic", "dramatic", "film")),
]

# Prompt signals that should penalize certain templates / aesthetics
_ANTI_SIGNAL_MAP: dict[str, tuple[str, ...]] = {
    "purple_gradient": ("purple", "violet", "indigo gradient", "neon purple"),
    "inter_default": ("use inter", "default system font"),
    "card_spam_dashboard": ("card spam", "too many cards"),
    "neon_glow": ("neon", "glow effect", "cyberpunk glow"),
    "glassmorphism_overload": ("heavy glass", "glass everywhere"),
    "hero_marketing_first": ("marketing landing", "waitlist hero"),
    "dense_dashboard": ("not a dashboard", "avoid dashboard"),
    "soft_gray_editorial": ("not editorial", "avoid gray canvas"),
    "terminal_dark": ("not dark", "avoid terminal"),
    "playful_illustration": ("no illustrations", "serious only"),
    "marketing_hero": ("not marketing", "app not landing"),
    "saas_sidebar": ("no sidebar", "bottom nav only"),
    "kpi_spam": ("no kpis", "not analytics"),
    "dashboard_kpi_spam": ("not analytics", "no kpi"),
    "brutalist": ("not brutalist",),
    "clinical_cold": ("not clinical", "warm only"),
    "rounded_full_pills_everywhere": ("sharp corners", "no pills"),
}


def classify_design_intent(user_prompt: str, domain: str = "") -> dict[str, Any]:
    """
    Offline heuristic intent classifier.

    Base44 triad: function (archetype) + layout + mood.
    Lovable: visual_brief_clear → skip open-ended design guidance.
    Emergent: who/why cues + named reference apps.
    """
    blob = f"{domain} {user_prompt}".lower()
    archetype = "b2b_workspace"
    archetype_hits: list[tuple[int, str]] = []
    for arch, kws in _ARCHETYPE_RULES:
        hits = sum(1 for k in kws if k in blob)
        if hits:
            archetype_hits.append((hits, arch))
    if archetype_hits:
        archetype_hits.sort(key=lambda x: (-x[0], x[1]))
        archetype = archetype_hits[0][1]

    style_tags: list[str] = []
    for tag, kws in _STYLE_RULES:
        if any(k in blob for k in kws):
            style_tags.append(tag)

    layout_intent = ""
    layout_hits: list[tuple[int, str]] = []
    for layout, kws in _LAYOUT_RULES:
        hits = sum(1 for k in kws if k in blob)
        if hits:
            layout_hits.append((hits, layout))
    if layout_hits:
        layout_hits.sort(key=lambda x: (-x[0], x[1]))
        layout_intent = layout_hits[0][1]
    else:
        layout_intent = _default_layout_for_archetype(archetype)

    mood = ""
    for mood_id, kws in _MOOD_RULES:
        if any(k in blob for k in kws):
            mood = mood_id
            break
    if not mood:
        mood = _default_mood_for_archetype(archetype)
    # Fold mood into style tags
    for fragment in mood.split("_"):
        if fragment and fragment not in style_tags and len(fragment) > 2:
            style_tags.append(fragment)

    # Soft defaults from archetype when prompt is style-silent
    if len(style_tags) < 2:
        for t in _default_styles_for_archetype(archetype):
            if t not in style_tags:
                style_tags.append(t)

    reference_apps: list[str] = []
    reference_boost_ids: list[str] = []
    for label, phrases, boost_ids in _REFERENCE_APP_RULES:
        if any(p in blob for p in phrases):
            reference_apps.append(label)
            reference_boost_ids.extend(boost_ids)

    anti_signals: list[str] = []
    for anti, phrases in _ANTI_SIGNAL_MAP.items():
        if any(p in blob for p in phrases):
            anti_signals.append(anti)

    # Always discourage generic AI aesthetics unless user asked for them
    if "purple" not in blob and "violet" not in blob:
        anti_signals.append("purple_gradient")
    if "inter" not in blob:
        anti_signals.append("inter_default")

    domain_hint = (domain or "").strip().lower() or _domain_for_archetype(archetype)
    vibe_hints = _vibe_hints(archetype, style_tags)
    surfaces = _surface_hints(blob, archetype)

    # Lovable: skip open-ended design guidance when visual direction is already clear
    visual_brief_clear = _visual_brief_is_clear(blob, reference_apps, style_tags)

    # Emergent-style who/why lightweight extraction
    audience = _extract_audience(blob)
    function_summary = _function_summary(archetype, surfaces)

    return {
        "archetype": archetype,
        "style_tags": style_tags[:8],
        "vibe_hints": vibe_hints,
        "anti_signals": list(dict.fromkeys(anti_signals))[:12],
        "domain_hint": domain_hint,
        "product_surface_hints": surfaces,
        # Base44 Function + Layout + Mood
        "function": function_summary,
        "layout_intent": layout_intent,
        "mood": mood,
        "reference_apps": reference_apps[:4],
        "reference_boost_ids": list(dict.fromkeys(reference_boost_ids))[:6],
        "visual_brief_clear": visual_brief_clear,
        "audience": audience,
    }


def find_best_figma_template(
    user_prompt: str,
    domain: str = "",
    *,
    top_k: int = 4,
) -> dict[str, Any]:
    """
    Classify intent → score catalog → return best template + design_match payload.

    Scoring (always available offline):
      domain + archetype + layout + style + vibe + keyword/TF-IDF
      + named reference-app boosts − anti-pattern / Collections penalties
    Optional: embedding cosine when embedder is available (blended).
    Lovable: candidates[:3] also exposed as design_directions.
    """
    prompt = (user_prompt or "").strip()
    domain_norm = (domain or "").strip().lower()
    index = list(SEED_TEMPLATES)
    if not index:
        return _empty_match()

    intent = classify_design_intent(prompt, domain_norm)
    top_k = max(1, min(int(top_k or 4), 8))

    use_embeddings = True
    query_vec: list[float] | None = None
    try:
        from engines.knowledge.embedder import embed

        query_vec = embed(
            " ".join(
                [
                    intent["domain_hint"],
                    intent["archetype"],
                    intent.get("layout_intent") or "",
                    intent.get("mood") or "",
                    " ".join(intent["style_tags"]),
                    " ".join(intent["vibe_hints"]),
                    " ".join(intent.get("reference_apps") or []),
                    prompt,
                ]
            )
        )
        if not query_vec:
            use_embeddings = False
    except Exception:
        use_embeddings = False

    scored: list[dict[str, Any]] = []
    for tmpl in index:
        factors = _score_template(
            prompt=prompt,
            domain_norm=domain_norm,
            intent=intent,
            tmpl=tmpl,
            query_vec=query_vec if use_embeddings else None,
        )
        scored.append(factors)

    scored.sort(key=lambda x: x["score"], reverse=True)
    best = scored[0]
    tmpl = best["template"]
    out = dict(tmpl)
    out["score"] = round(best["score"], 4)
    out["match_method"] = best["method"]
    out["match_reason"] = best["reason"]
    out["design_intent"] = intent
    out["candidates"] = [
        {
            "id": s["template"].get("id"),
            "domain": s["template"].get("domain"),
            "product_archetype": s["template"].get("product_archetype"),
            "style_tags": list(s["template"].get("style_tags") or [])[:6],
            "layout_pattern": s["template"].get("layout_pattern"),
            "vibe": str(s["template"].get("vibe") or "")[:120],
            "score": round(s["score"], 4),
            "reason": s["reason"],
            "placeholder": bool(s["template"].get("placeholder")),
        }
        for s in scored[:top_k]
    ]
    out["design_match"] = build_design_match(out, intent=intent)
    return out


def build_design_match(match: dict[str, Any], *, intent: dict[str, Any] | None = None) -> dict[str, Any]:
    """Compact design_match blob for blueprint / design_system phase."""
    intent = intent or match.get("design_intent") or {}
    refs = list(match.get("reference_descriptors") or [])[:2]
    if not refs:
        refs = list(match.get("reference_urls") or [])[:2]
    tokens = match.get("design_tokens") if isinstance(match.get("design_tokens"), dict) else {}
    candidates = list(match.get("candidates") or [])[:4]
    # Lovable-style design directions = top 3 alternate style boards
    directions = [
        {
            "id": c.get("id"),
            "archetype": c.get("product_archetype"),
            "style_tags": list(c.get("style_tags") or [])[:4],
            "layout_pattern": c.get("layout_pattern"),
            "vibe": c.get("vibe"),
            "score": c.get("score"),
        }
        for c in candidates[:3]
    ]
    return {
        "archetype": str(match.get("product_archetype") or intent.get("archetype") or "")[:64],
        "domain": str(match.get("domain") or intent.get("domain_hint") or "")[:40],
        "style_tags": list(match.get("style_tags") or intent.get("style_tags") or [])[:8],
        "vibe": str(match.get("vibe") or "")[:200],
        "layout_pattern": str(
            match.get("layout_pattern") or intent.get("layout_intent") or ""
        )[:80],
        "score": float(match.get("score") or 0.0),
        "rationale": str(match.get("match_reason") or "")[:400],
        "template_id": str(match.get("id") or "")[:64],
        "reference_descriptors": [str(r)[:160] for r in refs],
        "anti_patterns": list(match.get("anti_patterns") or [])[:8],
        "match_method": str(match.get("match_method") or "keyword")[:32],
        "candidates": candidates,
        # Base44 triad + Lovable/Emergent extras
        "function": str(intent.get("function") or "")[:200],
        "layout_intent": str(intent.get("layout_intent") or match.get("layout_pattern") or "")[:80],
        "mood": str(intent.get("mood") or "")[:64],
        "reference_apps": list(intent.get("reference_apps") or [])[:4],
        "product_surface_hints": list(intent.get("product_surface_hints") or [])[:6],
        "visual_brief_clear": bool(intent.get("visual_brief_clear")),
        "audience": str(intent.get("audience") or "")[:80],
        "token_hints": {str(k)[:40]: str(v)[:64] for k, v in list(tokens.items())[:10]},
        "design_directions": directions,
    }


def format_style_brief(design_match: dict[str, Any] | None) -> str:
    """
    Style brief for design_system / vision prompts.
    Base44 triad + Lovable negatives + Emergent reference borrowing.
    """
    if not isinstance(design_match, dict) or not design_match:
        return ""
    tags = ", ".join(str(t) for t in (design_match.get("style_tags") or [])[:6]) or "product-specific"
    refs = design_match.get("reference_descriptors") or []
    ref_lines = "\n".join(f"- {r}" for r in refs[:2]) or "- (derive from domain)"
    antis = ", ".join(str(a) for a in (design_match.get("anti_patterns") or [])[:6]) or (
        "purple_gradient, inter_default, generic AI chrome"
    )
    surfaces = ", ".join(str(s) for s in (design_match.get("product_surface_hints") or [])[:4])
    named = ", ".join(str(a) for a in (design_match.get("reference_apps") or [])[:3])
    directions = design_match.get("design_directions") or []
    dir_lines = ""
    if directions and not design_match.get("visual_brief_clear"):
        dir_lines = "\n## Alternate design directions (Lovable-style top-3 — prefer #1 unless UX demands otherwise)\n"
        for i, d in enumerate(directions[:3], 1):
            dir_lines += (
                f"- D{i}: {d.get('id')} · {d.get('layout_pattern') or 'n/a'} · "
                f"{', '.join(str(t) for t in (d.get('style_tags') or [])[:3])}\n"
            )
    tokens = design_match.get("token_hints") or {}
    token_line = ""
    if tokens:
        token_line = (
            f"- Token hints: bg={tokens.get('bg', '?')}, accent={tokens.get('accent', tokens.get('fg', '?'))}, "
            f"display={tokens.get('font_display', '?')}, sans={tokens.get('font_sans', '?')}\n"
        )
    return (
        f"## Matched design brief (prompt→template matcher · Base44 triad)\n"
        f"- Function: {design_match.get('function') or design_match.get('archetype') or 'n/a'}\n"
        f"- Layout: {design_match.get('layout_intent') or design_match.get('layout_pattern') or 'n/a'}\n"
        f"- Mood: {design_match.get('mood') or 'n/a'}\n"
        f"- Archetype: {design_match.get('archetype') or 'n/a'}\n"
        f"- Domain: {design_match.get('domain') or 'n/a'}\n"
        f"- Style tags: {tags}\n"
        f"- Vibe: {design_match.get('vibe') or 'n/a'}\n"
        f"- Surfaces to paint: {surfaces or 'primary workspace'}\n"
        f"- Named references: {named or 'none'}\n"
        f"- Audience: {design_match.get('audience') or 'n/a'}\n"
        f"- Template: {design_match.get('template_id') or 'n/a'} "
        f"(score={design_match.get('score', 0):.3f})\n"
        f"- Rationale: {design_match.get('rationale') or 'n/a'}\n"
        f"{token_line}"
        f"## Reference descriptors (build to this quality — v0/Lovable/Base44 bar)\n"
        f"{ref_lines}\n"
        f"{dir_lines}"
        f"## Negative constraints (never ship these)\n"
        f"- {antis}\n"
        f"- No purple-on-white / indigo gradients, no Inter/Roboto/Arial, no card-spam dashboards, "
        f"no neon glow, no generic AI SaaS skin.\n"
        f"- Do NOT force Collections/Trove gray+Platypi unless archetype is gallery_curation.\n"
    )


def _score_template(
    *,
    prompt: str,
    domain_norm: str,
    intent: dict[str, Any],
    tmpl: dict[str, Any],
    query_vec: list[float] | None,
) -> dict[str, Any]:
    reasons: list[str] = []
    score = 0.0
    method = "heuristic"

    tmpl_domain = str(tmpl.get("domain") or "").lower()
    tmpl_arch = str(tmpl.get("product_archetype") or "").lower()
    tmpl_styles = {str(s).lower() for s in (tmpl.get("style_tags") or [])}
    tmpl_vibe = str(tmpl.get("vibe") or "").lower()
    tmpl_antis = {str(a).lower() for a in (tmpl.get("anti_patterns") or [])}
    tmpl_layout = str(tmpl.get("layout_pattern") or "").lower()
    tmpl_id = str(tmpl.get("id") or "")

    # Domain
    domain_score = 0.0
    if domain_norm and domain_norm == tmpl_domain:
        domain_score = 0.22
        reasons.append(f"domain={tmpl_domain}")
    elif intent.get("domain_hint") and intent["domain_hint"] == tmpl_domain:
        domain_score = 0.16
        reasons.append(f"domain_hint={tmpl_domain}")
    score += domain_score

    # Archetype (function)
    if intent.get("archetype") and intent["archetype"] == tmpl_arch:
        score += 0.28
        reasons.append(f"archetype={tmpl_arch}")
    elif intent.get("archetype") and intent["archetype"] in tmpl_arch:
        score += 0.12
        reasons.append(f"archetype_partial={tmpl_arch}")

    # Base44 layout axis
    layout_intent = str(intent.get("layout_intent") or "").lower()
    if layout_intent and tmpl_layout:
        if layout_intent == tmpl_layout:
            score += 0.14
            reasons.append(f"layout={tmpl_layout}")
        elif layout_intent in tmpl_layout or tmpl_layout in layout_intent:
            score += 0.07
            reasons.append(f"layout_partial={tmpl_layout}")
        # Soft alias: grid_of_cards ↔ product_grid / kpi_grid
        elif layout_intent == "grid_of_cards" and "grid" in tmpl_layout:
            score += 0.06
            reasons.append("layout_alias=grid")

    # Style overlap
    intent_styles = {str(s).lower() for s in (intent.get("style_tags") or [])}
    style_overlap = intent_styles & tmpl_styles
    if style_overlap:
        style_pts = min(0.22, 0.06 * len(style_overlap))
        score += style_pts
        reasons.append(f"styles={'+'.join(sorted(style_overlap)[:4])}")

    # Mood token in vibe/styles
    mood = str(intent.get("mood") or "").lower()
    if mood:
        mood_bits = {b for b in mood.split("_") if len(b) > 2}
        if mood_bits & (tmpl_styles | _tokenize(tmpl_vibe)):
            score += 0.06
            reasons.append(f"mood={mood}")

    # Named reference app boost (Base44 "borrow from apps")
    boost_ids = {str(x) for x in (intent.get("reference_boost_ids") or [])}
    if tmpl_id and tmpl_id in boost_ids:
        score += 0.12
        reasons.append(f"ref_app_boost={tmpl_id}")

    # Vibe token overlap
    vibe_tokens = _tokenize(" ".join(intent.get("vibe_hints") or []) + " " + prompt)
    tmpl_vibe_tokens = _tokenize(tmpl_vibe + " " + str(tmpl.get("description") or ""))
    vibe_inter = vibe_tokens & tmpl_vibe_tokens
    if vibe_inter:
        vibe_pts = min(0.12, 0.02 * len(vibe_inter))
        score += vibe_pts
        reasons.append(f"vibe_tokens={len(vibe_inter)}")

    # Keyword / TF-IDF
    kw = _keyword_score(prompt, domain_norm, tmpl)
    score += 0.35 * kw
    if kw > 0.05:
        reasons.append(f"keyword={kw:.2f}")

    # Anti-pattern alignment
    prompt_antis = {str(a).lower() for a in (intent.get("anti_signals") or [])}
    for anti in prompt_antis:
        if anti in tmpl_antis:
            score += 0.02  # aligned negative constraints

    # Penalize curation template when archetype is not curation (pure-UI guard)
    if tmpl_id == "collections_curation" and intent.get("archetype") != "gallery_curation":
        score -= 0.45
        reasons.append("penalty=non_curation_vs_collections")

    # Soft penalty if template vibe includes banned aesthetics the user rejected
    for anti in prompt_antis:
        if anti.replace("_", " ") in tmpl_vibe or anti in tmpl_styles:
            score -= 0.08
            reasons.append(f"anti_penalty={anti}")

    # Optional embedding blend
    if query_vec is not None:
        try:
            from engines.knowledge.embedder import cosine, embed

            doc = " ".join(
                [
                    tmpl_domain,
                    tmpl_arch,
                    tmpl_layout,
                    " ".join(tmpl_styles),
                    tmpl_vibe,
                    str(tmpl.get("description") or ""),
                    " ".join(tmpl.get("keywords") or []),
                ]
            )
            emb = float(cosine(query_vec, embed(doc)))
            score = 0.55 * score + 0.45 * max(0.0, emb)
            method = "embedding+heuristic"
            reasons.append(f"embed={emb:.2f}")
        except Exception:
            method = "heuristic"

    score = max(0.0, min(1.5, score))
    reason = "; ".join(reasons) if reasons else "weak_keyword_only"
    return {
        "score": score,
        "method": method,
        "reason": reason[:400],
        "template": tmpl,
    }


def _keyword_score(prompt: str, domain: str, tmpl: dict[str, Any]) -> float:
    """Jaccard + TF-IDF-style overlap when embedding API is unavailable."""
    prompt_tokens = _tokenize(f"{domain} {prompt}")
    doc_tokens = _tokenize(
        " ".join(
            [
                str(tmpl.get("domain") or ""),
                str(tmpl.get("product_archetype") or ""),
                " ".join(tmpl.get("style_tags") or []),
                str(tmpl.get("vibe") or ""),
                str(tmpl.get("description") or ""),
                " ".join(tmpl.get("keywords") or []),
            ]
        )
    )
    if not prompt_tokens or not doc_tokens:
        return 0.0

    domain_bonus = 0.25 if domain and domain == str(tmpl.get("domain") or "").lower() else 0.0
    inter = prompt_tokens & doc_tokens
    union = prompt_tokens | doc_tokens
    jaccard = len(inter) / len(union) if union else 0.0

    corpus = [
        _tokenize(
            " ".join(
                [
                    str(t.get("description") or ""),
                    " ".join(t.get("keywords") or []),
                    " ".join(t.get("style_tags") or []),
                ]
            )
        )
        for t in SEED_TEMPLATES
    ]
    n = len(corpus) or 1
    tfidf = 0.0
    for tok in inter:
        df = sum(1 for c in corpus if tok in c) or 1
        idf = math.log((n + 1) / df) + 1.0
        tfidf += idf
    tfidf_norm = tfidf / (len(inter) * 3.0) if inter else 0.0
    return min(1.0, 0.55 * jaccard + 0.45 * min(1.0, tfidf_norm) + domain_bonus)


def _tokenize(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9_]+", (text or "").lower()) if len(t) > 2}


def _default_styles_for_archetype(archetype: str) -> list[str]:
    return {
        "gallery_curation": ["editorial", "minimal", "calm"],
        "career_pipeline": ["confident", "clarity", "warm_neutral"],
        "clinical_ops": ["trust", "calm", "accessible"],
        "developer_platform": ["terminal", "dense", "dark_ink"],
        "trip_planner": ["wanderlust", "airy", "editorial"],
        "marketplace": ["commerce", "product_grid", "conversion"],
        "conversational_agent": ["conversational", "soft", "intimate"],
        "data_dashboard": ["data_dense", "neutral_pro", "minimal"],
        "portfolio_showcase": ["editorial", "expressive", "typography_led"],
        "fintech_ops": ["trust", "precision", "cool_neutral"],
        "learning_platform": ["friendly", "progress", "encouraging"],
        "booking_scheduler": ["calm", "clarity", "conversion"],
        "b2b_workspace": ["minimal", "productive", "neutral"],
    }.get(archetype, ["minimal", "productive"])


def _default_layout_for_archetype(archetype: str) -> str:
    return {
        "gallery_curation": "masonry_feed_bottom_nav",
        "career_pipeline": "kanban_pipeline_forms",
        "clinical_ops": "roster_detail_timeline",
        "developer_platform": "repo_list_pr_diff",
        "trip_planner": "itinerary_map_split",
        "marketplace": "product_grid_filters_cart",
        "conversational_agent": "chat_thread_composer",
        "data_dashboard": "kpi_grid_charts_filters",
        "portfolio_showcase": "case_study_scroll",
        "fintech_ops": "balances_transactions_charts",
        "learning_platform": "course_list_lesson_player",
        "booking_scheduler": "calendar_slots_confirm",
        "b2b_workspace": "workspace_sidebar_list_detail",
    }.get(archetype, "workspace_sidebar_list_detail")


def _default_mood_for_archetype(archetype: str) -> str:
    return {
        "gallery_curation": "calm_professional",
        "career_pipeline": "warm_earthy",
        "clinical_ops": "cool_calm",
        "developer_platform": "developer_focused",
        "trip_planner": "warm_earthy",
        "marketplace": "sleek_premium",
        "conversational_agent": "calm_professional",
        "data_dashboard": "minimal",
        "portfolio_showcase": "expressive",
        "fintech_ops": "sleek_premium",
        "learning_platform": "bold_playful",
        "booking_scheduler": "calm_professional",
        "b2b_workspace": "minimal",
    }.get(archetype, "minimal")


def _domain_for_archetype(archetype: str) -> str:
    return {
        "gallery_curation": "curation",
        "career_pipeline": "career",
        "clinical_ops": "healthcare",
        "developer_platform": "coding",
        "trip_planner": "travel",
        "marketplace": "commerce",
        "conversational_agent": "chat",
        "data_dashboard": "analytics",
        "portfolio_showcase": "portfolio",
        "fintech_ops": "finance",
        "learning_platform": "education",
        "booking_scheduler": "scheduling",
        "b2b_workspace": "saas",
    }.get(archetype, "saas")


def _vibe_hints(archetype: str, style_tags: list[str]) -> list[str]:
    base = {
        "gallery_curation": ["calm", "curated", "editorial"],
        "career_pipeline": ["momentum", "confidence", "clarity"],
        "clinical_ops": ["trust", "calm", "clinical"],
        "developer_platform": ["speed", "terminal", "dense"],
        "trip_planner": ["wanderlust", "map", "airy"],
        "marketplace": ["commerce", "product", "conversion"],
        "conversational_agent": ["intimate", "message", "soft"],
        "data_dashboard": ["kpi", "charts", "neutral"],
        "portfolio_showcase": ["editorial", "showcase", "typography"],
        "fintech_ops": ["ledger", "trust", "precision"],
        "learning_platform": ["progress", "course", "encouraging"],
        "booking_scheduler": ["calendar", "slots", "calm"],
        "b2b_workspace": ["productive", "workspace", "restrained"],
    }.get(archetype, ["product", "clarity"])
    return list(dict.fromkeys([*base, *style_tags[:3]]))[:6]


def _surface_hints(blob: str, archetype: str) -> list[str]:
    """Lightweight product-surface cues (v0/Base44: paint the screen)."""
    surfaces = {
        "gallery_curation": ["masonry feed", "collections grid", "save detail"],
        "career_pipeline": ["application kanban", "resume lab", "interview prep"],
        "clinical_ops": ["patient roster", "labs timeline", "appointments"],
        "developer_platform": ["repo list", "PR diff", "deployments"],
        "trip_planner": ["itinerary timeline", "map split", "bookings"],
        "marketplace": ["product grid", "filters", "cart checkout"],
        "conversational_agent": ["thread list", "composer", "memory panel"],
        "data_dashboard": ["KPI strip", "chart grid", "filter bar"],
        "portfolio_showcase": ["case study scroll", "project grid", "about"],
        "fintech_ops": ["balances", "transactions", "transfer"],
        "learning_platform": ["course cards", "lesson player", "progress"],
        "booking_scheduler": ["service picker", "calendar slots", "confirm booking"],
        "b2b_workspace": ["project list", "work surface", "team settings"],
    }.get(archetype, ["primary workspace", "detail view", "settings"])
    if "mobile" in blob:
        surfaces = ["mobile-first " + surfaces[0], *surfaces[1:]]
    return surfaces


def _function_summary(archetype: str, surfaces: list[str]) -> str:
    label = archetype.replace("_", " ")
    surface_bit = ", ".join(surfaces[:2]) if surfaces else "core screens"
    return f"{label} — {surface_bit}"[:200]


def _extract_audience(blob: str) -> str:
    """Emergent who/why cue — best-effort audience phrase."""
    patterns = [
        r"for ([a-z][a-z\s]{2,40}?)(?: who|\.|,|$)",
        r"used by ([a-z][a-z\s]{2,40}?)(?:\.|,|$)",
        r"helps ([a-z][a-z\s]{2,40}?)(?:\.|,|$)",
    ]
    for pat in patterns:
        m = re.search(pat, blob)
        if m:
            aud = re.sub(r"\s+", " ", m.group(1)).strip()
            if len(aud) >= 3 and aud not in ("the", "a", "an", "my", "our"):
                return aud[:80]
    return ""


def _visual_brief_is_clear(blob: str, reference_apps: list[str], style_tags: list[str]) -> bool:
    """
    Lovable: skip open-ended design guidance when visual direction is already clear
    (fonts, hex colors, named brands/apps, or strong style buzzwords).
    """
    if reference_apps:
        return True
    if re.search(r"#[0-9a-f]{3,8}\b", blob):
        return True
    if any(k in blob for k in ("font family", "use platypi", "use fraunces", "brand colors", "design system")):
        return True
    strong = {"editorial", "brutalist", "terminal", "cinematic", "premium", "playful", "minimal"}
    if len(strong & set(style_tags)) >= 2:
        return True
    # Functional surfaces Lovable skips guidance for
    if any(k in blob for k in ("dashboard", "admin panel", "internal tool", "auth only", "schema")):
        return True
    return False


def _empty_match() -> dict[str, Any]:
    empty_intent = {
        "archetype": "",
        "style_tags": [],
        "vibe_hints": [],
        "anti_signals": [],
        "domain_hint": "",
        "product_surface_hints": [],
        "function": "",
        "layout_intent": "",
        "mood": "",
        "reference_apps": [],
        "reference_boost_ids": [],
        "visual_brief_clear": False,
        "audience": "",
    }
    return {
        "id": "",
        "file_key": "",
        "node_id": "",
        "domain": "",
        "product_archetype": "",
        "style_tags": [],
        "description": "",
        "design_tokens": {},
        "score": 0.0,
        "match_method": "none",
        "match_reason": "",
        "candidates": [],
        "design_intent": empty_intent,
        "design_match": build_design_match({}, intent=empty_intent),
    }
