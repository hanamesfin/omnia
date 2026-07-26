/**
 * design-templates.ts
 * 96 curated design templates — 12 categories × 8 templates each.
 * Rendered live (CSS variables) in the picker — no static images required.
 */

export type TemplateCategory =
  | "minimal"
  | "editorial"
  | "dark-pro"
  | "glassmorphism"
  | "colorful"
  | "dashboard"
  | "brutalist"
  | "terminal"
  | "organic"
  | "luxury"
  | "neumorphic"
  | "retro";

export type RadiusMode = "sharp" | "rounded" | "pill";
export type MotionMode = "instant" | "fluid" | "bouncy";

export type DesignTemplate = {
  id: string;
  name: string;
  category: TemplateCategory;
  vibe: string;
  tokens: {
    colors: {
      bg: string;
      fg: string;
      surface: string;
      muted: string;
      accent: string;
      border: string;
    };
    typography: {
      font_display: string;
      font_sans: string;
      font_mono: string;
    };
    radius: RadiusMode;
    motion: MotionMode;
  };
};

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  minimal: "Minimal",
  editorial: "Editorial",
  "dark-pro": "Dark Pro",
  glassmorphism: "Glassmorphism",
  colorful: "Colorful",
  dashboard: "Dashboard",
  brutalist: "Brutalist",
  terminal: "Terminal",
  organic: "Organic",
  luxury: "Luxury",
  neumorphic: "Neumorphic",
  retro: "Retro",
};

export const ALL_CATEGORIES: TemplateCategory[] = [
  "minimal", "editorial", "dark-pro", "glassmorphism", "colorful",
  "dashboard", "brutalist", "terminal", "organic", "luxury", "neumorphic", "retro",
];

// ─── Factory ─────────────────────────────────────────────────────────────────

function tpl(
  id: string, name: string, category: TemplateCategory, vibe: string,
  bg: string, fg: string, surface: string, muted: string, accent: string, border: string,
  dispFont: string, sansFont: string, monoFont: string,
  radius: RadiusMode, motion: MotionMode
): DesignTemplate {
  return {
    id, name, category, vibe,
    tokens: {
      colors: { bg, fg, surface, muted, accent, border },
      typography: { font_display: dispFont, font_sans: sansFont, font_mono: monoFont },
      radius, motion,
    },
  };
}

// ─── Templates ───────────────────────────────────────────────────────────────

export const DESIGN_TEMPLATES: DesignTemplate[] = [

  // ── MINIMAL ──────────────────────────────────────────────────────────────
  tpl("paper-white",    "Paper White",    "minimal", "Pure signal, zero noise",
    "#ffffff","#1a1a1a","#f8f8f8","#9a9a9a","#1a1a1a","rgba(0,0,0,0.08)", "Inter","Inter","JetBrains Mono","sharp","fluid"),
  tpl("off-white",      "Off-White",      "minimal", "Warm calm, editorial restraint",
    "#f9f6f1","#2d2926","#f0ece5","#a89d8e","#d4470c","rgba(45,41,38,0.08)", "Outfit","Outfit","JetBrains Mono","rounded","fluid"),
  tpl("chalk",          "Chalk",          "minimal", "Soft texture, structured clarity",
    "#f5f5f4","#1c1917","#e8e5e1","#a8a29e","#4f46e5","rgba(0,0,0,0.06)", "Inter","Inter","Fira Code","sharp","instant"),
  tpl("pure-light",     "Pure Light",     "minimal", "Maximum legibility, zero distraction",
    "#fafaf9","#111827","#f3f4f6","#6b7280","#6366f1","rgba(17,24,39,0.06)", "Plus Jakarta Sans","Plus Jakarta Sans","Source Code Pro","rounded","fluid"),
  tpl("cream",          "Cream",          "minimal", "Warm, literary, unhurried",
    "#fffbf0","#292524","#f5f0e0","#a8956b","#c2410c","rgba(0,0,0,0.08)", "Crimson Pro","Crimson Pro","JetBrains Mono","pill","fluid"),
  tpl("mist",           "Mist",           "minimal", "Airy cool, structured calm",
    "#f0f2f5","#1e2228","#e4e8ef","#7a8494","#3b82f6","rgba(0,0,0,0.06)", "DM Sans","DM Sans","Source Code Pro","rounded","fluid"),
  tpl("snow",           "Snow",           "minimal", "Crisp, clinical, modern",
    "#ffffff","#0f172a","#f8fafc","#94a3b8","#0ea5e9","rgba(15,23,42,0.06)", "Inter","Inter","JetBrains Mono","sharp","instant"),
  tpl("linen",          "Linen",          "minimal", "Tactile, warm, considered",
    "#fdf8f2","#2c1a0e","#f4ead8","#967c5c","#b45309","rgba(44,26,14,0.08)", "Lora","DM Sans","JetBrains Mono","pill","fluid"),

  // ── EDITORIAL ────────────────────────────────────────────────────────────
  tpl("broadsheet",     "Broadsheet",     "editorial", "Ink on paper, morning conviction",
    "#f5f0e8","#1a1209","#ede4d0","#8a7558","#8b1a1a","rgba(26,18,9,0.1)", "Playfair Display","Source Sans 3","Source Code Pro","sharp","fluid"),
  tpl("magazine",       "Magazine",       "editorial", "Bold, glossy, front-page urgency",
    "#ffffff","#111111","#f5f5f5","#888888","#e11d48","rgba(0,0,0,0.08)", "Playfair Display","Inter","JetBrains Mono","sharp","fluid"),
  tpl("literary",       "Literary Review","editorial", "Deep reading, careful reflection",
    "#fcf8f1","#2b1d0e","#f0e8d8","#967a52","#6b21a8","rgba(43,29,14,0.08)", "EB Garamond","Nunito Sans","Fira Code","rounded","fluid"),
  tpl("dispatch",       "Dispatch",       "editorial", "Correspondent's urgency, field notes",
    "#f8f4ec","#1c1208","#ece4d4","#7a6848","#b45309","rgba(0,0,0,0.08)", "Lora","Source Sans 3","Source Code Pro","sharp","instant"),
  tpl("portfolio",      "Portfolio",      "editorial", "Work that speaks for itself",
    "#fafaf9","#18171a","#f0f0ef","#888888","#ec4899","rgba(0,0,0,0.06)", "EB Garamond","DM Sans","JetBrains Mono","sharp","fluid"),
  tpl("review",         "The Review",     "editorial", "Measured opinion, craft over flash",
    "#fffef9","#231f1a","#f5f0e6","#9a8872","#d97706","rgba(35,31,26,0.07)", "Merriweather","Nunito Sans","Source Code Pro","rounded","fluid"),
  tpl("sunday-paper",   "Sunday Paper",   "editorial", "Leisurely depth, warm authority",
    "#f9f5eb","#27200d","#ede4cc","#8a7548","#92400e","rgba(0,0,0,0.07)", "Lora","Inter","JetBrains Mono","rounded","fluid"),
  tpl("gazette",        "The Gazette",    "editorial", "Established, trusted, permanent",
    "#f0ece0","#1a1510","#e4dece","#857a62","#15803d","rgba(26,21,16,0.08)", "EB Garamond","Source Sans 3","Fira Code","sharp","instant"),

  // ── DARK PRO ─────────────────────────────────────────────────────────────
  tpl("midnight",       "Midnight",       "dark-pro", "Deep focus, no interruptions",
    "#0f172a","#e2e8f0","#1e293b","#64748b","#6366f1","rgba(226,232,240,0.08)", "Inter","Inter","JetBrains Mono","rounded","fluid"),
  tpl("onyx",           "Onyx",           "dark-pro", "Absolute darkness, electric clarity",
    "#0a0a0b","#f1f1f1","#141415","#6b6b6b","#22d3ee","rgba(255,255,255,0.07)", "DM Sans","DM Sans","Source Code Pro","sharp","instant"),
  tpl("carbon",         "Carbon",         "dark-pro", "Dense, reliable, developer-grade",
    "#0d0d0e","#e8eaed","#1a1a1c","#5f6368","#8ab4f8","rgba(255,255,255,0.08)", "Inter","Inter","JetBrains Mono","sharp","instant"),
  tpl("void",           "Void",           "dark-pro", "Nothing wasted, everything intentional",
    "#000000","#ffffff","#0a0a0a","#555555","#00ff88","rgba(255,255,255,0.06)", "Inter","Inter","JetBrains Mono","sharp","instant"),
  tpl("slate",          "Slate",          "dark-pro", "Measured, professional, scalable",
    "#0f1117","#dfe3ee","#1c2133","#5c6680","#4ade80","rgba(223,227,238,0.08)", "Plus Jakarta Sans","Plus Jakarta Sans","Fira Code","rounded","fluid"),
  tpl("obsidian",       "Obsidian",       "dark-pro", "Creative darkness, violet depth",
    "#0d0b1a","#e8e0ff","#1a1530","#6b5f8a","#a855f7","rgba(168,85,247,0.12)", "DM Sans","DM Sans","JetBrains Mono","rounded","fluid"),
  tpl("night-mode",     "Night Mode",     "dark-pro", "Warm dark, golden ambition",
    "#1a1208","#f5e6c8","#261b0c","#7a6040","#f59e0b","rgba(245,158,11,0.12)", "Outfit","Outfit","Source Code Pro","rounded","fluid"),
  tpl("shadow",         "Shadow",         "dark-pro", "Calm depth, cyan precision",
    "#0a0e14","#d0d8e8","#131924","#4a5568","#06b6d4","rgba(6,182,212,0.1)", "Inter","Inter","JetBrains Mono","sharp","fluid"),

  // ── GLASSMORPHISM ────────────────────────────────────────────────────────
  tpl("frost",          "Frost",          "glassmorphism", "Translucent, cosmic, elevated",
    "#6b21a8","#ffffff","rgba(255,255,255,0.12)","rgba(255,255,255,0.55)","#e879f9","rgba(255,255,255,0.18)", "DM Sans","DM Sans","JetBrains Mono","rounded","bouncy"),
  tpl("crystal",        "Crystal",        "glassmorphism", "Prismatic clarity, layered depth",
    "#1e1b4b","#f5f3ff","rgba(255,255,255,0.08)","rgba(245,243,255,0.5)","#818cf8","rgba(255,255,255,0.12)", "Plus Jakarta Sans","Plus Jakarta Sans","Fira Code","rounded","fluid"),
  tpl("aurora",         "Aurora",         "glassmorphism", "Northern lights, dreamy depth",
    "#0f2027","#e0f2fe","rgba(255,255,255,0.06)","rgba(224,242,254,0.5)","#38bdf8","rgba(56,189,248,0.15)", "DM Sans","DM Sans","JetBrains Mono","pill","bouncy"),
  tpl("ice",            "Ice",            "glassmorphism", "Cold precision, glass architecture",
    "#0c1e3e","#e2f4ff","rgba(255,255,255,0.08)","rgba(226,244,255,0.45)","#60a5fa","rgba(255,255,255,0.1)", "Inter","Inter","Source Code Pro","rounded","fluid"),
  tpl("prism",          "Prism",          "glassmorphism", "Refracted light, soft spectrum",
    "#1a0533","#f0e6ff","rgba(255,255,255,0.07)","rgba(240,230,255,0.45)","#f472b6","rgba(244,114,182,0.15)", "Outfit","Outfit","JetBrains Mono","pill","bouncy"),
  tpl("chrome",         "Chrome",         "glassmorphism", "Metallic sheen, mirror surface",
    "#0f0f14","#d4d8e2","rgba(255,255,255,0.06)","rgba(212,216,226,0.4)","#c8d0e0","rgba(255,255,255,0.1)", "Inter","Inter","JetBrains Mono","sharp","fluid"),
  tpl("smoke",          "Smoke",          "glassmorphism", "Haze and atmosphere, subtle depth",
    "#1e1e24","#d0d0dc","rgba(255,255,255,0.06)","rgba(208,208,220,0.4)","#a8b8d0","rgba(255,255,255,0.08)", "DM Sans","DM Sans","Source Code Pro","rounded","fluid"),
  tpl("pearl",          "Pearl",          "glassmorphism", "Luminous, precious, quiet luxury",
    "#2a1040","#fdf4ff","rgba(255,255,255,0.1)","rgba(253,244,255,0.5)","#e879f9","rgba(255,255,255,0.15)", "Lora","DM Sans","JetBrains Mono","pill","bouncy"),

  // ── COLORFUL ─────────────────────────────────────────────────────────────
  tpl("neon-pop",       "Neon Pop",       "colorful", "High-voltage energy, electric night",
    "#0f0f14","#f0f0f8","#1a1a24","#6060a0","#ff3cac","rgba(255,60,172,0.2)", "Outfit","Outfit","JetBrains Mono","pill","bouncy"),
  tpl("candy",          "Candy",          "colorful", "Playful, sweet, irresistibly fun",
    "#fff0f8","#3d0030","#ffe4f2","#c060a0","#ff4da6","rgba(255,77,166,0.15)", "Plus Jakarta Sans","Plus Jakarta Sans","JetBrains Mono","pill","bouncy"),
  tpl("citrus",         "Citrus",         "colorful", "Zesty energy, sunny optimism",
    "#fffff0","#2d2500","#fff8e0","#9a8030","#f59e0b","rgba(245,158,11,0.15)", "Outfit","Outfit","Source Code Pro","rounded","fluid"),
  tpl("tropical",       "Tropical",       "colorful", "Vibrant, lush, full of life",
    "#f0fff8","#0a2520","#d4f5e5","#3a7a5a","#10b981","rgba(16,185,129,0.15)", "Plus Jakarta Sans","Plus Jakarta Sans","JetBrains Mono","pill","bouncy"),
  tpl("cotton-candy",   "Cotton Candy",   "colorful", "Dreamy softness, pastel romance",
    "#fff0f5","#3d0020","#ffe0ee","#c04070","#f43f5e","rgba(244,63,94,0.15)", "DM Sans","DM Sans","JetBrains Mono","pill","bouncy"),
  tpl("electric-blue",  "Electric Blue",  "colorful", "High-voltage clarity, charged presence",
    "#001030","#c0d8ff","#001848","#4060a0","#3b82f6","rgba(59,130,246,0.2)", "Inter","Inter","Source Code Pro","rounded","fluid"),
  tpl("sunset",         "Sunset",         "colorful", "Warm gradient, dusk ambition",
    "#1a0020","#ffe8f0","#2d0035","#904060","#f472b6","rgba(244,114,182,0.18)", "Outfit","Outfit","JetBrains Mono","pill","bouncy"),
  tpl("coral",          "Coral",          "colorful", "Warm energy, Mediterranean joy",
    "#fff5f0","#3a1000","#ffe8e0","#c07050","#f97316","rgba(249,115,22,0.15)", "Plus Jakarta Sans","Plus Jakarta Sans","Fira Code","rounded","fluid"),

  // ── DASHBOARD ────────────────────────────────────────────────────────────
  tpl("analytics-dark", "Analytics Dark", "dashboard", "Data command center, night shift",
    "#0c111d","#e2e8f0","#131928","#475569","#3b82f6","rgba(255,255,255,0.06)", "Inter","Inter","JetBrains Mono","sharp","instant"),
  tpl("admin-light",    "Admin Light",    "dashboard", "Clean control, enterprise clarity",
    "#f8fafc","#0f172a","#ffffff","#64748b","#3b82f6","rgba(15,23,42,0.08)", "Inter","Inter","Source Code Pro","sharp","fluid"),
  tpl("command-center", "Command Center", "dashboard", "Mission critical, operational green",
    "#080e14","#90a8c0","#0e1820","#384858","#10b981","rgba(16,185,129,0.12)", "Inter","Inter","JetBrains Mono","sharp","instant"),
  tpl("data-lab",       "Data Lab",       "dashboard", "Scientific precision, blue clarity",
    "#0a1628","#c8d8f0","#101e38","#406080","#60a5fa","rgba(96,165,250,0.12)", "DM Sans","DM Sans","Source Code Pro","sharp","fluid"),
  tpl("business-suite", "Business Suite", "dashboard", "Corporate trust, reliable depth",
    "#ffffff","#1e293b","#f8fafc","#64748b","#1d4ed8","rgba(30,41,59,0.1)", "Inter","Inter","JetBrains Mono","rounded","fluid"),
  tpl("operations",     "Operations",     "dashboard", "Always-on, systems reliability",
    "#1e2433","#c8d4e8","#262f44","#5a6888","#818cf8","rgba(255,255,255,0.07)", "Plus Jakarta Sans","Plus Jakarta Sans","Source Code Pro","sharp","instant"),
  tpl("finance-pro",    "Finance Pro",    "dashboard", "Gold-standard precision, dark wealth",
    "#0a0e16","#d0c8b0","#111622","#5a5040","#d4a853","rgba(212,168,83,0.14)", "Inter","Inter","JetBrains Mono","sharp","instant"),
  tpl("metrics",        "Metrics",        "dashboard", "Clear numbers, immediate insight",
    "#ffffff","#111111","#f5f5f8","#888888","#6366f1","rgba(99,102,241,0.12)", "Inter","Inter","Fira Code","sharp","instant"),

  // ── BRUTALIST ────────────────────────────────────────────────────────────
  tpl("concrete",       "Concrete",       "brutalist", "Raw material, honest structure",
    "#e8e5e0","#1a1a18","#d0ccc5","#7a7770","#ff3300","#1a1a18", "Inter","Inter","JetBrains Mono","sharp","instant"),
  tpl("newsprint",      "Newsprint",      "brutalist", "Black ink, printed truth",
    "#f5f2ea","#000000","#e8e4dc","#444444","#cc0000","#000000", "EB Garamond","EB Garamond","Source Code Pro","sharp","instant"),
  tpl("anti-design",    "Anti-Design",    "brutalist", "Rules broken on purpose",
    "#ffffff","#000000","#f0f0f0","#777777","#ff0000","#000000", "EB Garamond","Inter","JetBrains Mono","sharp","instant"),
  tpl("basel-grid",     "Basel Grid",     "brutalist", "The grid as supreme authority",
    "#f5f5f0","#111111","#ebebeb","#888888","#0000ff","#111111", "Inter","Inter","Source Code Pro","sharp","instant"),
  tpl("zine",           "Zine",           "brutalist", "Cut, paste, photocopy, publish",
    "#fffdf0","#1a0a00","#f0e8d0","#8a7040","#ff4400","#1a0a00", "EB Garamond","Inter","JetBrains Mono","sharp","instant"),
  tpl("postmodern",     "Postmodern",     "brutalist", "Deconstructed, self-aware, ironic",
    "#f0e8ff","#0a0018","#e0d0f8","#6040a0","#ff2200","#0a0018", "Lora","Inter","Fira Code","sharp","instant"),
  tpl("memphis",        "Memphis",        "brutalist", "Geometric pop, 80s maximalism",
    "#fff8e0","#0a0820","#ffe860","#8060a0","#ff6b35","#0a0820", "Inter","Inter","Source Code Pro","sharp","fluid"),
  tpl("bold-print",     "Bold Print",     "brutalist", "Ink-heavy, statement-loud, direct",
    "#1a1a14","#f5f0e0","#242418","#7a7460","#ffee00","#f5f0e0", "EB Garamond","EB Garamond","JetBrains Mono","sharp","instant"),

  // ── TERMINAL ─────────────────────────────────────────────────────────────
  tpl("green-terminal", "Green Terminal", "terminal", "Classic phosphor glow, timeless",
    "#0d1109","#33ff00","#111808","#256500","#66ff33","rgba(51,255,0,0.12)", "Source Code Pro","Source Code Pro","Source Code Pro","sharp","instant"),
  tpl("amber-crt",      "Amber CRT",      "terminal", "Warm cathode warmth, retro precision",
    "#0d0900","#ffb000","#141000","#7a5500","#ffcc00","rgba(255,176,0,0.12)", "Source Code Pro","Source Code Pro","Source Code Pro","sharp","instant"),
  tpl("blue-vt100",     "Blue VT100",     "terminal", "Mainframe authority, blue command",
    "#000033","#4488ff","#000044","#224488","#66aaff","rgba(68,136,255,0.14)", "Source Code Pro","Source Code Pro","Source Code Pro","sharp","instant"),
  tpl("white-terminal", "White Terminal", "terminal", "Modern CLI, clean command",
    "#1a1a1a","#f0f0f0","#222222","#666666","#ffffff","rgba(255,255,255,0.1)", "JetBrains Mono","JetBrains Mono","JetBrains Mono","sharp","instant"),
  tpl("matrix",         "Matrix",         "terminal", "Digital rain, cascading code",
    "#000800","#00ff41","#000c00","#006600","#00ff41","rgba(0,255,65,0.1)", "Source Code Pro","Source Code Pro","Source Code Pro","sharp","instant"),
  tpl("retro-shell",    "Retro Shell",    "terminal", "8-bit authority, BIOS nostalgia",
    "#000080","#c0c0c0","#000090","#808080","#ffffff","rgba(192,192,192,0.2)", "Source Code Pro","Source Code Pro","Source Code Pro","sharp","instant"),
  tpl("ibm-blue",       "IBM Blue",       "terminal", "Enterprise mainframe, trusted blue",
    "#001e60","#e8e8e8","#002070","#607090","#78a8ff","rgba(120,168,255,0.15)", "Source Code Pro","Source Code Pro","Source Code Pro","sharp","instant"),
  tpl("unix-dark",      "Unix Dark",      "terminal", "Shell-forward, developer native",
    "#1e1e1e","#e0e0e0","#2a2a2a","#7a7a7a","#e06c75","rgba(255,255,255,0.08)", "JetBrains Mono","JetBrains Mono","JetBrains Mono","sharp","instant"),

  // ── ORGANIC ──────────────────────────────────────────────────────────────
  tpl("forest",         "Forest",         "organic", "Canopy depth, verdant calm",
    "#0e1a0e","#d4e8d0","#162016","#4a6a44","#52c41a","rgba(82,196,26,0.12)", "Lora","Nunito Sans","Source Code Pro","rounded","fluid"),
  tpl("desert",         "Desert",         "organic", "Sun-baked warmth, ancient patience",
    "#f5e8d0","#2a1806","#eadab8","#9a7040","#c2622a","rgba(194,98,42,0.12)", "Lora","DM Sans","JetBrains Mono","rounded","fluid"),
  tpl("ocean",          "Ocean",          "organic", "Deep blue, tidal rhythm, vast",
    "#041c2e","#c8e8f8","#082438","#2a5878","#06b6d4","rgba(6,182,212,0.12)", "Lora","Nunito Sans","Source Code Pro","pill","fluid"),
  tpl("garden",         "Garden",         "organic", "Spring freshness, botanical detail",
    "#f0f8e8","#1a2e0e","#e0f0d0","#5a8040","#65a30d","rgba(101,163,13,0.12)", "Crimson Pro","DM Sans","JetBrains Mono","pill","bouncy"),
  tpl("stone",          "Stone",          "organic", "Mineral stillness, geological patience",
    "#e8e4dc","#2a2420","#dcd8cf","#8a8078","#78716c","rgba(42,36,32,0.08)", "EB Garamond","Nunito Sans","Source Code Pro","rounded","fluid"),
  tpl("moss",           "Moss",           "organic", "Damp forest floor, quiet persistence",
    "#1a2010","#c8d8b8","#222e18","#5a6a48","#84cc16","rgba(132,204,22,0.12)", "Lora","DM Sans","Fira Code","rounded","fluid"),
  tpl("clay",           "Clay",           "organic", "Terracotta warmth, handmade integrity",
    "#f2e8e0","#3a1808","#e8d8cc","#9a7060","#ea580c","rgba(234,88,12,0.12)", "Crimson Pro","Nunito Sans","JetBrains Mono","rounded","fluid"),
  tpl("birch",          "Birch",          "organic", "White bark, clean Nordic nature",
    "#f8f4ec","#2a2010","#f0e8d8","#9a8860","#92400e","rgba(146,64,14,0.1)", "Lora","DM Sans","Source Code Pro","pill","fluid"),

  // ── LUXURY ───────────────────────────────────────────────────────────────
  tpl("gold-black",     "Gold & Black",   "luxury", "Opulent darkness, timeless wealth",
    "#0a0800","#d4b060","#141000","#7a6020","#d4a853","rgba(212,168,83,0.16)", "EB Garamond","DM Sans","JetBrains Mono","sharp","fluid"),
  tpl("champagne",      "Champagne",      "luxury", "Effervescent refinement, light luxury",
    "#fdf8f0","#2a1e08","#f5e8d0","#9a8050","#c8963c","rgba(200,150,60,0.14)", "Lora","DM Sans","Source Code Pro","rounded","fluid"),
  tpl("monaco",         "Monaco",         "luxury", "Grand Prix grace, understated power",
    "#0a1428","#d0c8a8","#101c38","#504838","#c8963c","rgba(200,150,60,0.14)", "EB Garamond","Inter","JetBrains Mono","sharp","fluid"),
  tpl("noir",           "Noir",           "luxury", "Cinematic shadow, silver certainty",
    "#0a0a0a","#c8c8c8","#141414","#686868","#a8a8a8","rgba(200,200,200,0.1)", "Playfair Display","Inter","Source Code Pro","sharp","fluid"),
  tpl("versailles",     "Versailles",     "luxury", "Royal purple, gilded refinement",
    "#1e0a30","#e8d8f8","#280f40","#8060a0","#d4a853","rgba(212,168,83,0.15)", "EB Garamond","DM Sans","JetBrains Mono","rounded","fluid"),
  tpl("swiss",          "Swiss Watch",    "luxury", "Mechanism precision, no excess",
    "#f5f5f0","#1a1a14","#e8e8e0","#888880","#1a1a14","rgba(26,26,20,0.1)", "EB Garamond","Inter","Source Code Pro","sharp","instant"),
  tpl("couture",        "Couture",        "luxury", "Fashion editorial, clean elegance",
    "#f9f6f3","#1c1410","#f0ece4","#a09080","#c8963c","rgba(200,150,60,0.12)", "Playfair Display","DM Sans","JetBrains Mono","pill","fluid"),
  tpl("heritage",       "Heritage",       "luxury", "Institution gravitas, earned trust",
    "#0f0e0a","#e8e0c8","#1c1a14","#6a6050","#c8963c","rgba(200,150,60,0.14)", "Lora","Inter","Source Code Pro","sharp","fluid"),

  // ── NEUMORPHIC ───────────────────────────────────────────────────────────
  tpl("soft-light",     "Soft Light",     "neumorphic", "Pillowed depth, light dimension",
    "#e0e5ec","#2d3748","#e8ecf3","#6b7280","#6366f1","transparent", "DM Sans","DM Sans","JetBrains Mono","rounded","bouncy"),
  tpl("soft-dark",      "Soft Dark",      "neumorphic", "Dark clay, soft extruded surfaces",
    "#222831","#eeeeee","#2d3748","#718096","#06b6d4","transparent", "DM Sans","DM Sans","Source Code Pro","rounded","bouncy"),
  tpl("powder-blue",    "Powder Blue",    "neumorphic", "Aerial softness, calm confidence",
    "#d4e4f0","#1a2d40","#dcedf8","#5a82a0","#3b82f6","transparent", "Inter","Inter","JetBrains Mono","rounded","bouncy"),
  tpl("blush",          "Blush",          "neumorphic", "Warm pressure, rose-tinted depth",
    "#f0d8e4","#3d1428","#f8e4ec","#a05878","#f43f5e","transparent", "DM Sans","DM Sans","JetBrains Mono","pill","bouncy"),
  tpl("mint-soft",      "Mint",           "neumorphic", "Fresh dimension, clean sculpt",
    "#d4eee4","#1a3828","#ddf4ec","#4a8060","#10b981","transparent", "Inter","Inter","Source Code Pro","rounded","bouncy"),
  tpl("lavender-soft",  "Lavender",       "neumorphic", "Dreamy depth, violet serenity",
    "#e4d8f4","#2a1848","#ece0fc","#7858a0","#8b5cf6","transparent", "DM Sans","DM Sans","JetBrains Mono","pill","bouncy"),
  tpl("peach-soft",     "Peach",          "neumorphic", "Warm extrusion, tactile comfort",
    "#f4e0d4","#3d1e10","#fce8dc","#a07058","#f97316","transparent", "DM Sans","DM Sans","Fira Code","rounded","bouncy"),
  tpl("sky-soft",       "Sky",            "neumorphic", "Elevated airiness, open depth",
    "#d4eaf8","#1a2c40","#ddf0fc","#4a7898","#0ea5e9","transparent", "Inter","Inter","Source Code Pro","pill","bouncy"),

  // ── RETRO ────────────────────────────────────────────────────────────────
  tpl("groovy-70s",     "Groovy 70s",     "retro", "Harvest gold, corduroy warmth",
    "#c8720c","#f0e0b0","#d88020","#a06030","#f5d020","rgba(240,224,176,0.2)", "Outfit","Outfit","Source Code Pro","pill","bouncy"),
  tpl("disco",          "Disco Era",      "retro", "Mirror ball, chrome fantasy",
    "#1a0030","#ff66ff","#240040","#8020a0","#ff00ff","rgba(255,102,255,0.2)", "Outfit","Outfit","JetBrains Mono","pill","bouncy"),
  tpl("miami-vice",     "Miami Vice",     "retro", "Pastel crime, neon coast",
    "#0a1824","#ff6ec7","#141e30","#4a608a","#00d4ff","rgba(0,212,255,0.15)", "Outfit","Outfit","Source Code Pro","pill","fluid"),
  tpl("new-wave",       "New Wave",       "retro", "Synth surge, post-punk clarity",
    "#08001e","#e000ff","#0e0028","#5000a0","#00ff00","rgba(224,0,255,0.18)", "Inter","Inter","JetBrains Mono","sharp","instant"),
  tpl("arcade",         "Arcade",         "retro", "8-bit glory, pixel perfection",
    "#000020","#00ffaa","#000030","#004466","#ff2244","rgba(255,34,68,0.2)", "Source Code Pro","Source Code Pro","Source Code Pro","sharp","instant"),
  tpl("cassette",       "Cassette",       "retro", "Lo-fi warmth, tape saturation",
    "#d8c8a0","#2a1800","#c8b888","#806040","#c0440c","rgba(42,24,0,0.12)", "Lora","DM Sans","Source Code Pro","rounded","fluid"),
  tpl("vhs",            "VHS",            "retro", "Tape glitch, tracking nostalgia",
    "#0a0014","#b0d8ff","#100020","#403060","#ff80ff","rgba(255,128,255,0.15)", "Outfit","Outfit","Source Code Pro","sharp","instant"),
  tpl("psychedelic",    "Psychedelic",    "retro", "Swirling dimension, kaleidoscope",
    "#ff6b00","#001400","#ff8800","#4a2000","#00ff44","rgba(0,255,68,0.2)", "Outfit","Outfit","JetBrains Mono","pill","bouncy"),
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function filterTemplates(
  templates: DesignTemplate[],
  query: string,
  category: TemplateCategory | "all"
): DesignTemplate[] {
  const q = query.toLowerCase().trim();
  return templates.filter((t) => {
    const matchCat = category === "all" || t.category === category;
    const matchQ = !q
      || t.name.toLowerCase().includes(q)
      || t.vibe.toLowerCase().includes(q)
      || t.category.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
}

/** Convert DesignTemplate tokens → kindThemeCssVars-compatible object for AgentIsolatedShell */
export function templateToDesignSystem(t: DesignTemplate) {
  return {
    personality: t.id,
    emotional_goals: [t.category, t.vibe],
    tokens: {
      colors: t.tokens.colors,
      typography: t.tokens.typography,
      radius: t.tokens.radius,
      motion: { enter: t.tokens.motion === "bouncy" ? "fade-up 320ms cubic-bezier(0.34,1.56,0.64,1)" : t.tokens.motion === "instant" ? "fade-in 80ms linear" : "fade-up 260ms cubic-bezier(0.22,1,0.36,1)", micro: t.tokens.motion === "instant" ? "60ms linear" : "120ms ease" },
    },
  };
}

/** Google Fonts URL for a given display+sans+mono combination */
const FONT_URLS: Record<string, string> = {
  "Inter":             "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  "DM Sans":           "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap",
  "Outfit":            "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap",
  "Plus Jakarta Sans": "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap",
  "Nunito Sans":       "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700&display=swap",
  "EB Garamond":       "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap",
  "Lora":              "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&display=swap",
  "Playfair Display":  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap",
  "Merriweather":      "https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;1,400&display=swap",
  "Crimson Pro":       "https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap",
  "Source Sans 3":     "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap",
  "JetBrains Mono":    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap",
  "Fira Code":         "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap",
  "Source Code Pro":   "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap",
};

export function loadTemplateFonts(t: DesignTemplate): void {
  if (typeof document === "undefined") return;
  const fonts = new Set([t.tokens.typography.font_display, t.tokens.typography.font_sans, t.tokens.typography.font_mono]);
  fonts.forEach((font) => {
    const url = FONT_URLS[font];
    if (!url) return;
    if (document.querySelector(`link[href="${url}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  });
}
