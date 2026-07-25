"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ─── Data ────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "cover",      roman: "·",  label: "Cover"       },
  { id: "philosophy", roman: "I",  label: "Philosophy"  },
  { id: "method",     roman: "II", label: "Method"      },
  { id: "technique",  roman: "III",label: "Technique"   },
  { id: "practice",   roman: "IV", label: "Practice"    },
  { id: "policy",     roman: "V",  label: "Policy"      },
  { id: "appendix-a", roman: "A",  label: "Checklist"   },
  { id: "appendix-b", roman: "B",  label: "Reference"   },
];

const SCHOOLS = [
  {
    num: "01", name: "Silicon Valley",
    doctrine: "Ship the smallest thing that teaches you something — then ship again tomorrow.",
    accent: "#3b82f6", glow: "rgba(59,130,246,0.15)",
  },
  {
    num: "02", name: "Elon Musk · SpaceX & Tesla",
    doctrine: "The best part is no part. The best process is no process.",
    accent: "#e2e8f0", glow: "rgba(226,232,240,0.1)",
  },
  {
    num: "03", name: "Apple",
    doctrine: "Say no to a thousand things so the one thing left is obvious.",
    accent: "#a8a29e", glow: "rgba(168,162,158,0.12)",
  },
  {
    num: "04", name: "Unit 8200",
    doctrine: "Small teams, total ownership, zero hand-offs, real consequences.",
    accent: "#4ade80", glow: "rgba(74,222,128,0.12)",
  },
  {
    num: "05", name: "Shenzhen",
    doctrine: "Treat every screen like a circuit revision: cheap to prototype, fast to replace.",
    accent: "#fb923c", glow: "rgba(251,146,60,0.14)",
  },
];

const PHILOSOPHY = [
  {
    num: "01", title: "Question the Requirement Before You Design It",
    sub: "Every field, button, and screen must justify its existence from the ground up — not because a competitor has it.",
    body: "Before wireframing anything, ask what actual outcome makes this screen necessary. Most UI complexity is inherited, not required — carried over from a previous app, a competitor's pattern, or an assumption nobody re-checked. Strip the requirement back to first principles, then design forward from the outcome, not backward from a template you've seen before.",
    applied: "The Create flow shouldn't have a step because \"onboarding flows usually have a welcome screen.\" It should have exactly the steps required to produce a working agent, and no more.",
  },
  {
    num: "02", title: "The Interface Is the Entire Product",
    sub: "Users can't see your model weights, your prompt engineering, or your architecture. They can only see the screen.",
    body: "In an AI-integrated product, the intelligence is invisible by definition — it lives in a model the user will never inspect. That means the user's entire judgment about whether \"the AI is good\" is actually a judgment about the interface: how fast it responds, how clearly it explains itself, how gracefully it recovers from a wrong answer. Treat every screen as if it is the product, because to the user, it is.",
    applied: "If the agents OMNIA produces are excellent but the Create flow is confusing, users will conclude the agents are bad. The UI carries the reputation of the intelligence behind it.",
  },
  {
    num: "03", title: "Speed Is a Feature, Not a Trade-off Against Quality",
    sub: "The team that ships ten small revisions in the time a competitor ships one big redesign will out-learn them every time.",
    body: "Silicon Valley's real advantage was never talent density alone — it was treating iteration speed itself as a quality metric. A rougher version shipped this week and corrected next week beats a polished version shipped next quarter, because only the shipped version can be tested against reality. Speed and craft aren't opposites; the loop between them — ship, observe, revise — is what produces craft over time.",
    applied: "A rough first pass at the Appearance settings, actually used, teaches you more about which of the ten settings matter than a month spent designing all ten in isolation.",
  },
  {
    num: "04", title: "Small Teams, Total Ownership",
    sub: "One person who owns a feature end-to-end will out-execute five people who each own one-fifth of it.",
    body: "Elite technical units assign narrow, high-stakes problems to small teams — sometimes a single person — with total ownership and no hand-off. The person who designs the screen also has to make it survive contact with real data and real edge cases. That accountability produces sharper decisions than a committee ever will, because there's nowhere to hide a compromise.",
    applied: "Even building solo, apply this to yourself: own the Create flow's UX and its failure modes end-to-end, rather than treating \"design\" and \"does it actually work\" as two separate jobs.",
  },
  {
    num: "05", title: "Build Like Hardware, Ship Like Software",
    sub: "A UI revision should cost you as little as changing a component value on a breadboard.",
    body: "Shenzhen's manufacturing ecosystem can turn a design change into a physical prototype within a day, because the whole supply chain is built for iteration, not perfection-on-the-first-try. Software has no excuse to be slower than hardware. If changing a screen requires a multi-week review cycle, the process — not the idea — is the bottleneck. Build your design system so a UI change is a cheap, fast, reversible experiment.",
    applied: "A shared component library and design tokens let you revise the Explore page's card layout in an afternoon instead of re-touching every screen that uses a card.",
  },
  {
    num: "06", title: "Trust Is the Real Feature of an Autonomous System",
    sub: "The moment an AI agent acts without asking, the interface's only job is to keep the user in command of what just happened.",
    body: "This is the one philosophy here with no direct pre-AI precedent. When software only responded to clicks, trust was implicit. When software can create, modify, or delete on a user's behalf, the interface must constantly answer three questions: what is it doing, why, and how do I undo it. A product can have brilliant agents and still fail if people don't trust the UI's account of what those agents did.",
    applied: "Every agent should be able to state, in the Create or Yours view, what it just did and why — not just show the result.",
  },
];

const METHODS = [
  {
    id: "2.1", title: "The Musk Algorithm, Rewritten for UI Work",
    steps: [
      { n: "1", label: "Question every requirement.", body: "Attach a name to it. \"That's how it's usually done\" is not a requirement — a person, a rule, or a real constraint is. Every field, screen, and confirmation dialog needs an owner and a reason." },
      { n: "2", label: "Delete the part or the process.", body: "Try to remove the whole screen or step before you improve it. If you never add anything back after deleting, you probably aren't deleting enough." },
      { n: "3", label: "Simplify or optimize.", body: "Only after step two. Optimizing something that shouldn't exist is the single most common design mistake." },
      { n: "4", label: "Accelerate cycle time.", body: "Every process can go faster — but only once it's already been deleted and simplified. Shorten the loop between a design decision and real user reaction." },
      { n: "5", label: "Automate.", body: "Automation is the last step, never the first. Automating a flow that still has unnecessary steps just makes the mistakes happen faster." },
    ],
    applied: "Create-flow friction, walked through all five steps: question whether each interview question is truly needed → delete any the agent can infer or default → simplify the wording of what's left → shorten the perceived wait with streaming feedback → only then automate field population.",
  },
  {
    id: "2.2", title: "Apple's Method: Clarity, Deference, Depth",
    steps: [
      { n: "→", label: "Clarity", body: "Text is legible at every size, icons are precise, and every control signals what happens if it's pressed. For an AI product, clarity extends to confidence: say \"likely\" or \"uncertain\" in plain language, not a bare decimal a user has to interpret." },
      { n: "→", label: "Deference", body: "The interface recedes so the content, including AI-generated content, is what the user is actually looking at, not the chrome around it." },
      { n: "→", label: "Depth", body: "Visual layering and motion convey hierarchy. For AI features, depth also means progressive disclosure: a simple surface with real sophistication available one layer down — exactly like OMNIA's Normal tier being simple on top of the same product that holds Enterprise's depth underneath." },
    ],
    applied: null,
  },
  {
    id: "2.3", title: "The Compressed Design Sprint",
    steps: [
      { n: "1", label: "Map", body: "Write the problem as a user goal, not a feature request." },
      { n: "2", label: "Sketch", body: "Generate multiple divergent solutions on paper before touching a design tool." },
      { n: "3", label: "Decide", body: "Pick one direction with a rationale you could defend to a stranger." },
      { n: "4", label: "Prototype", body: "Build only enough fidelity to test that decision, not the whole feature." },
      { n: "5", label: "Test", body: "Put it in front of real or representative users and watch, without explaining it to them." },
    ],
    applied: null,
  },
  {
    id: "2.4", title: "PPCEE — The Loop for Autonomous Agent Actions",
    steps: [
      { n: "P", label: "Prompt", body: "Capture intent in the user's language, not the system's." },
      { n: "P", label: "Preview", body: "Show what will happen before it happens, wherever the action is non-trivial or hard to reverse." },
      { n: "C", label: "Confirm", body: "Require one explicit, low-friction confirmation for consequential actions, not a rubber-stamp dialog nobody reads." },
      { n: "E", label: "Execute", body: "Run it, with visible progress if it takes more than an instant." },
      { n: "E", label: "Explain", body: "Afterward, state plainly what changed and why, in one sentence a non-technical user would understand." },
    ],
    applied: "This loop is mandatory for any action an agent takes on a user's behalf — it is the operational form of Rule 06.",
  },
  {
    id: "2.5", title: "Red-Team Review",
    steps: [
      { n: "?", label: "Before any design is considered done,", body: "it gets reviewed once from an adversarial angle: how would this be misread, misused, or broken by a confused, rushed, or bad-faith user? This is a different question from usability testing. Usability asks \"can they do it.\" Red-teaming asks \"what happens when it goes wrong or gets abused\" — and it happens at design time, not after launch." },
    ],
    applied: null,
  },
];

const TECHNIQUES = [
  { n: "3.1", title: "Progressive Disclosure", body: "Show the minimum first; reveal depth on demand. OMNIA's Appearance menu should lead with font size and theme — the two settings almost everyone touches — while the other eight sit one tap deeper. The same pattern applies to the Create flow's guided interview: ask the smallest set of questions needed for a Normal-tier agent, and only surface Enterprise-tier's deeper configuration once that tier is chosen." },
  { n: "3.2", title: "Latency Masking", body: "Replace bare spinners with content-shaped skeletons that match the actual layout of what's loading. For AI output that streams token-by-token, begin rendering immediately — partial text is always better than a loader. The perceived wait shrinks by 40–60% even when the real wait is identical." },
  { n: "3.3", title: "Explainability Affordances", body: "Every AI-generated decision surfaces a path to its reasoning — a \"why\" button, a confidence qualifier, or a short one-line rationale inline. This affordance doesn't have to be loud; it has to exist. Users who never click it still trust the system more knowing they could." },
  { n: "3.4", title: "Navigation Techniques", body: "Top-level navigation must match the true number of destinations — not the aspirational roadmap. Every tab or sidebar item that isn't regularly used by the majority of users is a tax on every user's attention. Audit ruthlessly; remove or nest anything that fails a weekly active use bar." },
  { n: "3.5", title: "The Frictionless Auth Gate", body: "The logged-out view is exactly one sentence and one decision: what the product does, and a single call to action. No feature tour, no pricing grid, no testimonials on the gate screen. Users who haven't signed up yet have no context to appreciate those things; users who have don't need them. Get them inside fast." },
  { n: "3.6", title: "Tier Differentiation Without Dark Patterns", body: "Higher-tier features are additive — they add genuine capabilities that lower tiers don't have yet. They are never achieved by artificially crippling lower tiers with arbitrary limits on things that cost nothing to provide. The distinction between Normal, Pro, and Enterprise in OMNIA must always be \"here is more\" not \"we removed something to make you upgrade.\"" },
  { n: "3.7", title: "Type, Color, and Grid", body: "One type scale, one spacing unit, one set of theme tokens — applied consistently. Visual consistency isn't an aesthetic preference; it's how users learn where to look without thinking. Every deviation from the system requires justification proportional to how much it breaks the user's learned map of the interface." },
  { n: "3.8", title: "Motion as Status, Not Decoration", body: "Every animation communicates a real state change: loading, completion, error, transition between views. Animation that exists purely for visual richness — without communicating state — trains users to ignore motion, which then makes functional animations invisible. Use motion sparingly so it retains signal value." },
];

const PRACTICES = [
  { n: "4.1", title: "The Weekly Critique", body: "A recurring, scheduled review of work in progress, judged out loud against this doctrine's rules rather than personal taste — \"does this pass Rule 01?\" instead of \"I like this better.\" Even working solo, write the critique down. The discipline of articulating why a design survived review is what makes the review real." },
  { n: "4.2", title: "Prompt-as-Spec Practice", body: "Treat every prompt written for a Cursor AI framework as a design specification, not a casual ask: state the requirement, the constraint, and the rule from this doctrine it must satisfy — so AI-generated output gets checked against the same standard a human reviewer would use." },
  { n: "4.3", title: "Five-Person Hallway Testing", body: "Before calling a flow finished, put it in front of five people who've never seen it and watch them attempt the task without help. Five is enough to catch most usability problems. Waiting for a \"proper\" study is usually just a way to delay finding out you were wrong." },
  { n: "4.4", title: "The Living Design Log", body: "A running, dated record of design decisions and the reasoning behind them — a lightweight decision record for design, the same idea as an architecture decision record for code. When a decision gets questioned later, by an advisor, a defense panel, or future-you, the log is the answer." },
  { n: "4.5", title: "Defense-Day Rehearsal", body: "Rehearse a project defense demo the way a launch team rehearses a launch: a scripted reset procedure, a known-good offline fallback, and at least one full dry run under real time pressure before the actual day." },
];

const POLICIES = [
  { n: "5.1", title: "Accessibility Is Not Optional", body: "Every screen meets WCAG 2.1 AA at minimum: sufficient contrast, full keyboard operability, real alt text. Not because a rubric requires it, but because Rule 02 says the interface is the whole product — and a product that excludes users isn't done." },
  { n: "5.2", title: "No Dark Patterns, Ever", body: "No pre-checked upsells, no confirm-shaming, no hidden unsubscribe or delete flows. This is a hard line, not a style preference, regardless of what it might do for a conversion metric." },
  { n: "5.3", title: "Every Autonomous Action Must Be Previewable and Reversible", body: "If an agent can create, modify, or delete something on a user's behalf, the interface must let the user see it coming and undo it after. There is no exception for \"the AI is usually right.\"" },
  { n: "5.4", title: "AI-Generated Content Must Be Labeled", body: "Any agent output presented as content — a generated description, a recommendation, a score — carries a visible marker that it's machine-produced, so users are never misled into treating it as a human's work or an objective fact." },
  { n: "5.5", title: "Non-Functional Requirements Ship With the Feature", body: "Security, reliability, scalability, and cost are part of the same design review as the feature itself, not a follow-up pass after launch. A feature that's beautiful but insecure isn't eighty percent done — it isn't done." },
  { n: "5.6", title: "The Five-Second Clarity Test", body: "Nothing ships until a first-time viewer can state, within five seconds of seeing the screen, what it's for and what they can do on it. If they can't, it goes back to Rule 01 — not to a copy pass." },
  { n: "5.7", title: "Versioning and Rollback for UI, Not Just Code", body: "Every meaningful UI change is revertible as cleanly as a code change. If a redesign can't be rolled back quickly when it tests poorly, Rule 03's promise of speed without risk is just words." },
];

const CHECKLIST_GROUPS = [
  {
    category: "Philosophy", items: [
      { id: "p1", text: "Every field/screen has a named owner and reason (Rule 01)" },
      { id: "p2", text: "Treated the screen as the whole product, not a wrapper around the AI (Rule 02)" },
      { id: "p3", text: "Shipped a rough version instead of waiting for a polished one (Rule 03)" },
      { id: "p4", text: "One owner exists for this feature end-to-end (Rule 04)" },
      { id: "p5", text: "A UI change here can be made cheaply and fast (Rule 05)" },
      { id: "p6", text: "Every autonomous action explains itself afterward (Rule 06)" },
    ],
  },
  {
    category: "Method", items: [
      { id: "m1", text: "Ran Question → Delete → Simplify → Accelerate → Automate, in that order" },
      { id: "m2", text: "Checked the screen against Clarity, Deference, Depth" },
      { id: "m3", text: "Ran Map → Sketch → Decide → Prototype → Test before building final fidelity" },
      { id: "m4", text: "Any agent action follows Prompt → Preview → Confirm → Execute → Explain" },
      { id: "m5", text: "Red-teamed the design for misuse before calling it done" },
    ],
  },
  {
    category: "Technique", items: [
      { id: "t1", text: "Minimum-first, depth-on-demand for every settings surface" },
      { id: "t2", text: "Latency is masked with real content shapes, not a bare spinner" },
      { id: "t3", text: "A \"why\" is available for any AI-made decision" },
      { id: "t4", text: "Top-level navigation matches the true number of destinations" },
      { id: "t5", text: "Logged-out view is one sentence + one decision, nothing else" },
      { id: "t6", text: "Tier differences are additive, never artificial crippling" },
      { id: "t7", text: "Type scale, spacing unit, and theme tokens are consistent" },
      { id: "t8", text: "Every animation communicates a real state change" },
    ],
  },
  {
    category: "Practice", items: [
      { id: "pr1", text: "This week's critique happened and was written down" },
      { id: "pr2", text: "Prompts for the AI framework are written as specs, not casual asks" },
      { id: "pr3", text: "Five people outside your head have tried this flow" },
      { id: "pr4", text: "The design log has an entry for this decision" },
      { id: "pr5", text: "A defense-day dry run has been rehearsed under time pressure" },
    ],
  },
  {
    category: "Policy", items: [
      { id: "po1", text: "Contrast, keyboard access, and alt text all pass" },
      { id: "po2", text: "No dark pattern exists anywhere in this flow" },
      { id: "po3", text: "Every agent action can be previewed and undone" },
      { id: "po4", text: "AI-generated content is visibly labeled as such" },
      { id: "po5", text: "Security, reliability, scale, and cost were reviewed with the feature" },
      { id: "po6", text: "A first-time viewer passes the five-second clarity test" },
      { id: "po7", text: "This change can be rolled back as cleanly as it shipped" },
    ],
  },
];

const REFERENCE_ROWS = [
  { school: "Silicon Valley", belief: "Learning speed beats planning quality", steal: "Ship weekly, even when it's small" },
  { school: "Elon Musk / SpaceX & Tesla", belief: "Deletion beats optimization", steal: "The five-step algorithm, run in strict order" },
  { school: "Apple", belief: "Restraint is the design", steal: "Clarity, Deference, Depth as a review checklist" },
  { school: "Unit 8200", belief: "Ownership beats process", steal: "One owner per feature, no hand-offs" },
  { school: "Shenzhen", belief: "Iteration cost determines iteration speed", steal: "A design token system that makes change cheap" },
];

const TOTAL_ITEMS = CHECKLIST_GROUPS.reduce((s, g) => s + g.items.length, 0);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FieldManualPage() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState("cover");
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Inject fonts
  useEffect(() => {
    const href =
      "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap";
    if (!document.querySelector(`link[href="${href}"]`)) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      document.head.appendChild(l);
    }
  }, []);

  // Persist checklist
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fm-checklist-v1");
      if (raw) setChecked(new Set(JSON.parse(raw) as string[]));
    } catch { /* ignore */ }
  }, []);

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem("fm-checklist-v1", JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setChecked(new Set());
    try { localStorage.removeItem("fm-checklist-v1"); } catch { /* ignore */ }
  }, []);

  // Scroll spy
  useEffect(() => {
    observerRef.current?.disconnect();
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topmost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActiveId(topmost.target.id);
        }
      },
      { rootMargin: "-5% 0px -80% 0px", threshold: 0 }
    );
    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    observerRef.current = obs;
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const doneCount = checked.size;
  const pct = Math.round((doneCount / TOTAL_ITEMS) * 100);

  return (
    <>
      {/* ── Global styles scoped to this page ── */}
      <style>{`
        .fm-root {
          --fm-bg: #0c0b09;
          --fm-bg2: #111009;
          --fm-fg: #ede8df;
          --fm-muted: #7c7060;
          --fm-faint: #3a3528;
          --fm-accent: #c8963c;
          --fm-accent-dim: rgba(200,150,60,0.18);
          --fm-border: rgba(237,232,223,0.09);
          --fm-serif: "EB Garamond", Georgia, serif;
          --fm-sans: "DM Sans", system-ui, sans-serif;
          --fm-mono: "DM Mono", monospace;
          background: var(--fm-bg);
          color: var(--fm-fg);
          font-family: var(--fm-sans);
          min-height: 100dvh;
        }
        .fm-root * { box-sizing: border-box; }
        .fm-serif  { font-family: var(--fm-serif); }
        .fm-mono   { font-family: var(--fm-mono); }
        .fm-muted  { color: var(--fm-muted); }
        .fm-accent { color: var(--fm-accent); }

        /* Nav */
        .fm-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          display: flex; align-items: center; gap: 0;
          background: rgba(12,11,9,0.88);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid var(--fm-border);
          padding: 0 1.5rem;
          height: 48px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .fm-nav::-webkit-scrollbar { display: none; }
        .fm-nav-back {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--fm-muted); text-decoration: none;
          padding: 0.35rem 0.75rem 0.35rem 0;
          border-right: 1px solid var(--fm-border);
          margin-right: 1rem;
          white-space: nowrap;
          transition: color 0.15s;
          flex-shrink: 0;
        }
        .fm-nav-back:hover { color: var(--fm-fg); }
        .fm-nav-item {
          display: inline-flex; align-items: center; gap: 0.35rem;
          padding: 0.3rem 0.75rem; font-size: 0.7rem;
          letter-spacing: 0.07em; text-transform: uppercase;
          color: var(--fm-muted); cursor: pointer;
          border: none; background: none;
          white-space: nowrap; flex-shrink: 0;
          transition: color 0.15s;
          border-radius: 4px;
        }
        .fm-nav-item:hover  { color: var(--fm-fg); }
        .fm-nav-item.active { color: var(--fm-accent); }
        .fm-nav-roman {
          font-family: var(--fm-serif); font-size: 0.85rem;
          opacity: 0.6;
        }

        /* Layout */
        .fm-main  { padding-top: 48px; }
        .fm-wrap  { max-width: 780px; margin: 0 auto; padding: 0 1.5rem; }
        .fm-section { padding: 6rem 0 4rem; border-top: 1px solid var(--fm-border); scroll-margin-top: 48px; }
        .fm-section:first-child { border-top: none; }

        /* Cover */
        .fm-cover {
          min-height: 100dvh; display: flex; flex-direction: column;
          justify-content: center; align-items: flex-start;
          padding: 6rem 1.5rem 4rem;
          max-width: 780px; margin: 0 auto;
          scroll-margin-top: 48px;
        }
        .fm-cover-meta {
          font-size: 0.68rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--fm-muted); margin-bottom: 3rem;
          display: flex; align-items: center; gap: 1.5rem;
        }
        .fm-cover-meta::before {
          content: ""; display: block; width: 2rem; height: 1px;
          background: var(--fm-accent);
        }
        .fm-cover-title {
          font-family: var(--fm-serif); font-weight: 400;
          font-size: clamp(3rem, 8vw, 6rem); line-height: 1.05;
          letter-spacing: -0.02em; margin: 0 0 2rem;
          color: var(--fm-fg);
        }
        .fm-cover-title em { font-style: italic; color: var(--fm-accent); }
        .fm-cover-sub {
          font-size: 0.875rem; line-height: 1.7; color: var(--fm-muted);
          max-width: 42ch; margin-bottom: 3rem;
        }
        .fm-toc {
          display: flex; flex-wrap: wrap; gap: 0.5rem;
        }
        .fm-toc-pill {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.4rem 0.9rem; border: 1px solid var(--fm-border);
          border-radius: 999px; cursor: pointer; background: none;
          font-size: 0.75rem; letter-spacing: 0.05em; color: var(--fm-muted);
          transition: color 0.15s, border-color 0.15s;
        }
        .fm-toc-pill:hover { color: var(--fm-fg); border-color: rgba(237,232,223,0.25); }
        .fm-toc-roman {
          font-family: var(--fm-serif); color: var(--fm-accent); font-size: 0.9rem;
        }

        /* Section header */
        .fm-section-header {
          display: flex; align-items: baseline; gap: 1.25rem;
          margin-bottom: 3.5rem;
        }
        .fm-section-roman {
          font-family: var(--fm-serif); font-size: clamp(3.5rem, 8vw, 5rem);
          line-height: 1; color: var(--fm-faint); flex-shrink: 0;
          letter-spacing: -0.03em; user-select: none;
        }
        .fm-section-title {
          font-family: var(--fm-serif); font-size: clamp(1.5rem, 4vw, 2rem);
          font-weight: 400; line-height: 1.2; letter-spacing: -0.02em;
        }
        .fm-section-tagline {
          font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--fm-muted); margin-top: 0.25rem;
        }

        /* Schools */
        .fm-schools {
          padding: 5rem 1.5rem;
          max-width: 780px; margin: 0 auto;
        }
        .fm-school-grid {
          display: grid; gap: 1rem;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        }
        .fm-school-card {
          padding: 1.5rem; border-radius: 12px;
          border: 1px solid var(--card-border);
          background: var(--card-bg);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .fm-school-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.35);
        }
        .fm-school-num {
          font-family: var(--fm-serif); font-size: 0.75rem;
          letter-spacing: 0.15em; color: var(--card-accent);
          margin-bottom: 0.5rem; display: block;
        }
        .fm-school-name {
          font-weight: 600; font-size: 0.9rem; margin-bottom: 0.75rem;
          color: var(--card-accent);
        }
        .fm-school-doc {
          font-size: 0.85rem; line-height: 1.6; color: var(--fm-muted);
          font-family: var(--fm-serif); font-style: italic;
        }

        /* Rule card */
        .fm-rule {
          position: relative; padding: 2rem 0 2.5rem;
          border-bottom: 1px solid var(--fm-border);
        }
        .fm-rule:last-child { border-bottom: none; }
        .fm-rule-bg-num {
          position: absolute; top: 1rem; right: 0;
          font-family: var(--fm-serif); font-size: clamp(5rem, 12vw, 9rem);
          line-height: 1; color: var(--fm-faint); user-select: none;
          letter-spacing: -0.04em; pointer-events: none;
        }
        .fm-rule-num {
          font-family: var(--fm-mono); font-size: 0.68rem;
          letter-spacing: 0.15em; color: var(--fm-accent);
          margin-bottom: 0.75rem; display: block;
        }
        .fm-rule-title {
          font-family: var(--fm-serif); font-size: clamp(1.25rem, 3vw, 1.65rem);
          font-weight: 400; line-height: 1.25; margin-bottom: 0.75rem;
          max-width: 38ch;
        }
        .fm-rule-sub {
          font-size: 0.875rem; line-height: 1.65; color: var(--fm-muted);
          font-style: italic; margin-bottom: 1.25rem; max-width: 52ch;
        }
        .fm-rule-body {
          font-size: 0.9rem; line-height: 1.8; color: var(--fm-fg);
          opacity: 0.85; max-width: 60ch; margin-bottom: 1.5rem;
        }
        .fm-applied {
          display: flex; gap: 0.75rem; padding: 1rem 1.25rem;
          background: var(--fm-accent-dim);
          border-left: 2px solid var(--fm-accent);
          border-radius: 0 8px 8px 0;
        }
        .fm-applied-label {
          font-family: var(--fm-mono); font-size: 0.6rem;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--fm-accent); flex-shrink: 0; padding-top: 0.15rem;
        }
        .fm-applied-text {
          font-size: 0.82rem; line-height: 1.6; color: var(--fm-muted);
        }

        /* Method card */
        .fm-method {
          padding: 2rem 0 2.5rem; border-bottom: 1px solid var(--fm-border);
        }
        .fm-method:last-child { border-bottom: none; }
        .fm-method-id {
          font-family: var(--fm-mono); font-size: 0.65rem;
          letter-spacing: 0.18em; color: var(--fm-accent); margin-bottom: 0.6rem;
        }
        .fm-method-title {
          font-family: var(--fm-serif); font-size: clamp(1.1rem, 2.5vw, 1.4rem);
          font-weight: 400; line-height: 1.3; margin-bottom: 1.5rem;
        }
        .fm-steps { display: flex; flex-direction: column; gap: 0.75rem; }
        .fm-step {
          display: grid; grid-template-columns: 2rem 1fr;
          gap: 0 1rem; align-items: start;
        }
        .fm-step-n {
          font-family: var(--fm-serif); font-size: 1rem;
          color: var(--fm-accent); line-height: 1.6; text-align: center;
        }
        .fm-step-body { font-size: 0.875rem; line-height: 1.7; }
        .fm-step-label { font-weight: 600; }

        /* Technique */
        .fm-technique {
          padding: 1.5rem 0; border-bottom: 1px solid var(--fm-border);
        }
        .fm-technique:last-child { border-bottom: none; }
        .fm-technique-header {
          display: flex; align-items: baseline; gap: 1rem; margin-bottom: 0.75rem;
        }
        .fm-technique-n {
          font-family: var(--fm-mono); font-size: 0.65rem;
          letter-spacing: 0.15em; color: var(--fm-accent); flex-shrink: 0;
        }
        .fm-technique-title {
          font-family: var(--fm-serif); font-size: 1.1rem; font-weight: 400;
        }
        .fm-technique-body {
          font-size: 0.875rem; line-height: 1.75; color: rgba(237,232,223,0.75);
          padding-left: 3.5rem;
        }

        /* Practice */
        .fm-practice {
          display: grid; grid-template-columns: 3rem 1fr;
          gap: 0 1.5rem; padding: 1.75rem 0;
          border-bottom: 1px solid var(--fm-border); align-items: start;
        }
        .fm-practice:last-child { border-bottom: none; }
        .fm-practice-n {
          font-family: var(--fm-serif); font-size: 2rem; color: var(--fm-faint);
          line-height: 1.2; text-align: right; user-select: none;
        }
        .fm-practice-title {
          font-family: var(--fm-serif); font-size: 1.1rem; font-weight: 400;
          margin-bottom: 0.5rem;
        }
        .fm-practice-body {
          font-size: 0.875rem; line-height: 1.75; color: rgba(237,232,223,0.75);
        }

        /* Policy */
        .fm-policy {
          padding: 1.75rem 0; border-bottom: 1px solid var(--fm-border);
        }
        .fm-policy:last-child { border-bottom: none; }
        .fm-policy-tag {
          font-family: var(--fm-mono); font-size: 0.6rem; letter-spacing: 0.2em;
          text-transform: uppercase; color: #ef4444;
          margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.5rem;
        }
        .fm-policy-tag::before { content: ""; width: 6px; height: 6px; background: #ef4444; border-radius: 50%; display: block; }
        .fm-policy-header { display: flex; align-items: baseline; gap: 1rem; margin-bottom: 0.65rem; }
        .fm-policy-n { font-family: var(--fm-mono); font-size: 0.65rem; letter-spacing: 0.15em; color: var(--fm-muted); flex-shrink: 0; }
        .fm-policy-title { font-family: var(--fm-serif); font-size: 1.15rem; font-weight: 400; }
        .fm-policy-body { font-size: 0.875rem; line-height: 1.75; color: rgba(237,232,223,0.75); }

        /* Checklist */
        .fm-progress-bar-outer {
          height: 3px; background: var(--fm-faint); border-radius: 99px;
          overflow: hidden; margin: 1.25rem 0 2rem;
        }
        .fm-progress-bar-inner {
          height: 100%; background: var(--fm-accent); border-radius: 99px;
          transition: width 0.4s ease;
        }
        .fm-check-group { margin-bottom: 2.5rem; }
        .fm-check-group-label {
          font-family: var(--fm-mono); font-size: 0.65rem; letter-spacing: 0.18em;
          text-transform: uppercase; color: var(--fm-accent); margin-bottom: 0.75rem;
        }
        .fm-check-item {
          display: flex; align-items: flex-start; gap: 0.85rem;
          padding: 0.65rem 0; cursor: pointer;
          border-bottom: 1px solid var(--fm-border);
          transition: background 0.12s;
        }
        .fm-check-item:last-child { border-bottom: none; }
        .fm-check-item:hover { background: rgba(237,232,223,0.03); }
        .fm-check-box {
          width: 18px; height: 18px; flex-shrink: 0;
          border: 1px solid var(--fm-faint); border-radius: 4px;
          background: none; display: flex; align-items: center; justify-content: center;
          transition: border-color 0.15s, background 0.15s; margin-top: 0.1rem;
        }
        .fm-check-box.done { background: var(--fm-accent); border-color: var(--fm-accent); }
        .fm-check-text {
          font-size: 0.875rem; line-height: 1.55;
          color: rgba(237,232,223,0.8);
          transition: color 0.15s;
        }
        .fm-check-text.done {
          color: var(--fm-muted); text-decoration: line-through;
          text-decoration-color: var(--fm-faint);
        }
        .fm-reset-btn {
          background: none; border: 1px solid var(--fm-border);
          color: var(--fm-muted); cursor: pointer;
          font-family: var(--fm-mono); font-size: 0.65rem; letter-spacing: 0.14em;
          text-transform: uppercase; padding: 0.5rem 1rem; border-radius: 6px;
          transition: color 0.15s, border-color 0.15s;
        }
        .fm-reset-btn:hover { color: var(--fm-fg); border-color: rgba(237,232,223,0.25); }

        /* Reference table */
        .fm-table { width: 100%; border-collapse: collapse; }
        .fm-table th {
          font-family: var(--fm-mono); font-size: 0.62rem; letter-spacing: 0.15em;
          text-transform: uppercase; color: var(--fm-muted);
          text-align: left; padding: 0.6rem 1rem; border-bottom: 1px solid var(--fm-border);
        }
        .fm-table td {
          font-size: 0.875rem; line-height: 1.55; padding: 1.1rem 1rem;
          border-bottom: 1px solid var(--fm-border); vertical-align: top;
        }
        .fm-table tr:last-child td { border-bottom: none; }
        .fm-table tr:hover td { background: rgba(237,232,223,0.02); }
        .fm-table .fm-school-col { font-weight: 600; font-size: 0.82rem; white-space: nowrap; }
        .fm-table .steal-col {
          font-family: var(--fm-serif); font-style: italic;
          color: var(--fm-accent);
        }

        /* Footer */
        .fm-footer {
          border-top: 1px solid var(--fm-border); padding: 3rem 1.5rem;
          max-width: 780px; margin: 0 auto;
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 1rem;
        }
        .fm-footer-title {
          font-family: var(--fm-serif); font-size: 0.9rem; color: var(--fm-muted);
        }
        .fm-footer-meta {
          font-family: var(--fm-mono); font-size: 0.65rem; letter-spacing: 0.12em;
          color: var(--fm-faint);
        }

        @media (max-width: 600px) {
          .fm-cover-title { font-size: 2.8rem; }
          .fm-school-grid { grid-template-columns: 1fr; }
          .fm-technique-body { padding-left: 0; }
          .fm-practice { grid-template-columns: 2rem 1fr; gap: 0 1rem; }
          .fm-practice-n { font-size: 1.5rem; }
        }
      `}</style>

      <div className="fm-root">
        {/* ── Nav ── */}
        <nav className="fm-nav" aria-label="Field manual navigation">
          <Link href="/yours" className="fm-nav-back">
            ← OMNIA
          </Link>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`fm-nav-item${activeId === item.id ? " active" : ""}`}
              onClick={() => scrollTo(item.id)}
              aria-current={activeId === item.id ? "true" : undefined}
            >
              <span className="fm-nav-roman">{item.roman}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <main className="fm-main">
          {/* ── Cover ── */}
          <section id="cover" className="fm-cover">
            <div className="fm-cover-meta">
              <span>Field Manual · V1</span>
              <span>For AI-Integrated Web Products</span>
            </div>
            <h1 className="fm-cover-title">
              The Builder's<br /><em>Blueprint</em>
            </h1>
            <p className="fm-cover-sub">
              Five ways of working, distilled into one doctrine, for designing and shipping
              user interfaces in products where an AI does part of the thinking.
              Read it once top to bottom. Then use it as a checklist every time you open
              a design tool or a prompt window.
            </p>
            <div className="fm-toc">
              {NAV_ITEMS.slice(1).map((item) => (
                <button key={item.id} className="fm-toc-pill" onClick={() => scrollTo(item.id)}>
                  <span className="fm-toc-roman">{item.roman}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── Five Schools ── */}
          <div className="fm-schools">
            <div style={{ marginBottom: "2rem" }}>
              <p className="fm-muted fm-mono" style={{ fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Five Schools of Thought
              </p>
              <p style={{ fontSize: "0.875rem", color: "rgba(237,232,223,0.6)", maxWidth: "48ch", lineHeight: 1.65 }}>
                This doctrine draws equally from five distinct traditions. None of them alone is enough — together, they cover the full build cycle.
              </p>
            </div>
            <div className="fm-school-grid">
              {SCHOOLS.map((s) => (
                <div
                  key={s.num}
                  className="fm-school-card"
                  style={{
                    "--card-accent": s.accent,
                    "--card-bg": s.glow,
                    "--card-border": `${s.accent}22`,
                  } as React.CSSProperties}
                >
                  <span className="fm-school-num">SCHOOL {s.num}</span>
                  <div className="fm-school-name">{s.name}</div>
                  <div className="fm-school-doc">"{s.doctrine}"</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── I · Philosophy ── */}
          <div className="fm-wrap">
            <section id="philosophy" className="fm-section">
              <div className="fm-section-header">
                <div className="fm-section-roman">I</div>
                <div>
                  <div className="fm-section-title">Philosophy</div>
                  <div className="fm-section-tagline">Why you're building it this way</div>
                </div>
              </div>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.75, color: "rgba(237,232,223,0.65)", marginBottom: "3rem", maxWidth: "56ch" }}>
                Six beliefs that sit underneath every design decision below. None of them are style
                preferences — they're the reasons the methods, techniques, practices, and policies
                in the rest of this document exist at all.
              </p>
              {PHILOSOPHY.map((r) => (
                <div key={r.num} className="fm-rule">
                  <div className="fm-rule-bg-num">{r.num}</div>
                  <span className="fm-rule-num">RULE {r.num}</span>
                  <h3 className="fm-rule-title">{r.title}</h3>
                  <p className="fm-rule-sub">{r.sub}</p>
                  <p className="fm-rule-body">{r.body}</p>
                  <div className="fm-applied">
                    <span className="fm-applied-label">Applied → OMNIA</span>
                    <span className="fm-applied-text">{r.applied}</span>
                  </div>
                </div>
              ))}
            </section>

            {/* ── II · Method ── */}
            <section id="method" className="fm-section">
              <div className="fm-section-header">
                <div className="fm-section-roman">II</div>
                <div>
                  <div className="fm-section-title">Method</div>
                  <div className="fm-section-tagline">The process you actually run</div>
                </div>
              </div>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.75, color: "rgba(237,232,223,0.65)", marginBottom: "3rem", maxWidth: "56ch" }}>
                Philosophy tells you why. Method is the repeatable sequence of steps that turns
                that belief into a decision, every single time you sit down to design something.
              </p>
              {METHODS.map((m) => (
                <div key={m.id} className="fm-method">
                  <div className="fm-method-id">METHOD {m.id}</div>
                  <h3 className="fm-method-title">{m.title}</h3>
                  <div className="fm-steps">
                    {m.steps.map((step, i) => (
                      <div key={i} className="fm-step">
                        <div className="fm-step-n">{step.n}</div>
                        <div className="fm-step-body">
                          <span className="fm-step-label">{step.label} </span>
                          {step.body}
                        </div>
                      </div>
                    ))}
                  </div>
                  {m.applied && (
                    <div className="fm-applied" style={{ marginTop: "1.5rem" }}>
                      <span className="fm-applied-label">Applied → OMNIA</span>
                      <span className="fm-applied-text">{m.applied}</span>
                    </div>
                  )}
                </div>
              ))}
            </section>

            {/* ── III · Technique ── */}
            <section id="technique" className="fm-section">
              <div className="fm-section-header">
                <div className="fm-section-roman">III</div>
                <div>
                  <div className="fm-section-title">Technique</div>
                  <div className="fm-section-tagline">The tactics you reach for</div>
                </div>
              </div>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.75, color: "rgba(237,232,223,0.65)", marginBottom: "3rem", maxWidth: "56ch" }}>
                Eight concrete techniques for AI-integrated screens. Each one is a direct,
                tactical answer to a philosophy or method above.
              </p>
              {TECHNIQUES.map((t) => (
                <div key={t.n} className="fm-technique">
                  <div className="fm-technique-header">
                    <span className="fm-technique-n">{t.n}</span>
                    <h3 className="fm-technique-title">{t.title}</h3>
                  </div>
                  <p className="fm-technique-body">{t.body}</p>
                </div>
              ))}
            </section>

            {/* ── IV · Practice ── */}
            <section id="practice" className="fm-section">
              <div className="fm-section-header">
                <div className="fm-section-roman">IV</div>
                <div>
                  <div className="fm-section-title">Practice</div>
                  <div className="fm-section-tagline">The rituals that keep it real</div>
                </div>
              </div>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.75, color: "rgba(237,232,223,0.65)", marginBottom: "3rem", maxWidth: "56ch" }}>
                Methods and techniques only hold up if they're practiced on a schedule.
                These are the recurring habits that make the rest of this document more than a document.
              </p>
              {PRACTICES.map((p) => (
                <div key={p.n} className="fm-practice">
                  <div className="fm-practice-n">{p.n.split(".")[1]}</div>
                  <div>
                    <div className="fm-practice-title">{p.title}</div>
                    <div className="fm-practice-body">{p.body}</div>
                  </div>
                </div>
              ))}
            </section>

            {/* ── V · Policy ── */}
            <section id="policy" className="fm-section">
              <div className="fm-section-header">
                <div className="fm-section-roman">V</div>
                <div>
                  <div className="fm-section-title">Policy</div>
                  <div className="fm-section-tagline">What never gets broken</div>
                </div>
              </div>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.75, color: "rgba(237,232,223,0.65)", marginBottom: "0.75rem", maxWidth: "56ch" }}>
                Everything above is a judgment call, made well or poorly. These seven are not
                judgment calls. They are the floor beneath every screen this doctrine ever produces.
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "3rem", padding: "0.35rem 0.85rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px" }}>
                <span style={{ width: 6, height: 6, background: "#ef4444", borderRadius: "50%", display: "block" }} />
                <span style={{ fontFamily: "var(--fm-mono)", fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#ef4444" }}>
                  Non-Negotiable
                </span>
              </div>
              {POLICIES.map((p) => (
                <div key={p.n} className="fm-policy">
                  <div className="fm-policy-tag">Non-Negotiable</div>
                  <div className="fm-policy-header">
                    <span className="fm-policy-n">POLICY {p.n}</span>
                    <h3 className="fm-policy-title">{p.title}</h3>
                  </div>
                  <p className="fm-policy-body">{p.body}</p>
                </div>
              ))}
            </section>

            {/* ── Appendix A · Checklist ── */}
            <section id="appendix-a" className="fm-section">
              <div className="fm-section-header">
                <div className="fm-section-roman">A</div>
                <div>
                  <div className="fm-section-title">The One-Page Checklist</div>
                  <div className="fm-section-tagline">Run before every review</div>
                </div>
              </div>

              {/* Progress */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <span style={{ fontFamily: "var(--fm-serif)", fontSize: "2.5rem", lineHeight: 1, color: doneCount === TOTAL_ITEMS ? "var(--fm-accent)" : "var(--fm-fg)" }}>
                  {doneCount}
                </span>
                <span className="fm-muted" style={{ fontSize: "0.8rem" }}>/ {TOTAL_ITEMS} complete</span>
                {doneCount > 0 && (
                  <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--fm-accent)", fontFamily: "var(--fm-mono)" }}>
                    {pct}%
                  </span>
                )}
              </div>
              <div className="fm-progress-bar-outer">
                <div className="fm-progress-bar-inner" style={{ width: `${pct}%` }} />
              </div>

              {CHECKLIST_GROUPS.map((group) => (
                <div key={group.category} className="fm-check-group">
                  <div className="fm-check-group-label">{group.category}</div>
                  {group.items.map((item) => {
                    const done = checked.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="fm-check-item"
                        onClick={() => toggle(item.id)}
                        role="checkbox"
                        aria-checked={done}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(item.id); } }}
                      >
                        <div className={`fm-check-box${done ? " done" : ""}`} aria-hidden>
                          {done && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="#0c0b09" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span className={`fm-check-text${done ? " done" : ""}`}>{item.text}</span>
                      </div>
                    );
                  })}
                </div>
              ))}

              {doneCount > 0 && (
                <button className="fm-reset-btn" onClick={resetAll}>
                  Reset all
                </button>
              )}
            </section>

            {/* ── Appendix B · Reference Table ── */}
            <section id="appendix-b" className="fm-section">
              <div className="fm-section-header">
                <div className="fm-section-roman">B</div>
                <div>
                  <div className="fm-section-title">Reference Table</div>
                  <div className="fm-section-tagline">What to steal from each school</div>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="fm-table">
                  <thead>
                    <tr>
                      <th>School</th>
                      <th>Core Belief</th>
                      <th>One Thing to Steal Directly</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REFERENCE_ROWS.map((row) => (
                      <tr key={row.school}>
                        <td className="fm-school-col" style={{ color: "var(--fm-fg)" }}>{row.school}</td>
                        <td style={{ color: "rgba(237,232,223,0.65)" }}>{row.belief}</td>
                        <td className="steal-col">{row.steal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* ── Footer ── */}
          <footer>
            <div className="fm-footer">
              <div className="fm-footer-title fm-serif">
                Field Manual · V1 · The Builder's Blueprint
              </div>
              <div className="fm-footer-meta">
                PREPARED AS A REUSABLE STANDARD FOR OMNIA<br />
                AND ANY AI-INTEGRATED WEB PRODUCT
              </div>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
