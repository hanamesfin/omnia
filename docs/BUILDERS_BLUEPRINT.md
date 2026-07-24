# Field Manual · v1 — The Builder's Blueprint

**For any AI-integrated web product · Prepared as a reusable standard for OMNIA**

Five ways of working, distilled into one doctrine, for designing and shipping user interfaces in products where an AI does part of the thinking. Read it once top to bottom. Then use it as a checklist every time you open a design tool or a prompt window.

| Part | Focus |
|------|--------|
| §I Philosophy | Why you're building it this way |
| §II Method | The process you actually run |
| §III Technique | The tactics you reach for |
| §IV Practice | The rituals that keep it real |
| §V Policy | What never gets broken |
| Appendix A | One-page checklist |
| Appendix B | School reference table |

---

## The five schools

| School | Core line |
|--------|-----------|
| **01 · Silicon Valley** | Ship the smallest thing that teaches you something — then ship again tomorrow. |
| **02 · Elon Musk — SpaceX & Tesla** | The best part is no part. The best process is no process. |
| **03 · Apple** | Say no to a thousand things so the one thing left is obvious. |
| **04 · Unit 8200** | Small teams, total ownership, zero hand-offs, real consequences. |
| **05 · Shenzhen** | Treat every screen like a circuit revision: cheap to prototype, fast to replace. |

---

## Part I — Philosophy

Six beliefs that sit underneath every design decision below. None of them are style preferences — they're the reasons the methods, techniques, practices, and policies in the rest of this document exist at all.

### RULE 01 — Question the Requirement Before You Design It

Every field, button, and screen must justify its existence from the ground up — not because a competitor has it.

Before wireframing anything, ask what actual outcome makes this screen necessary. Most UI complexity is inherited, not required — carried over from a previous app, a competitor's pattern, or an assumption nobody re-checked. Strip the requirement back to first principles, then design forward from the outcome, not backward from a template you've seen before.

**Applied → OMNIA:** The Create flow shouldn't have a step because "onboarding flows usually have a welcome screen." It should have exactly the steps required to produce a working agent, and no more.

### RULE 02 — The Interface Is the Entire Product

Users can't see your model weights, your prompt engineering, or your architecture. They can only see the screen.

In an AI-integrated product, the intelligence is invisible by definition — it lives in a model the user will never inspect. That means the user's entire judgment about whether "the AI is good" is actually a judgment about the interface: how fast it responds, how clearly it explains itself, how gracefully it recovers from a wrong answer. Treat every screen as if it is the product, because to the user, it is.

**Applied → OMNIA:** If the agents OMNIA produces are excellent but the Create flow is confusing, users will conclude the agents are bad. The UI carries the reputation of the intelligence behind it.

### RULE 03 — Speed Is a Feature, Not a Trade-off Against Quality

The team that ships ten small revisions in the time a competitor ships one big redesign will out-learn them every time.

Silicon Valley's real advantage was never talent density alone — it was treating iteration speed itself as a quality metric. A rougher version shipped this week and corrected next week beats a polished version shipped next quarter, because only the shipped version can be tested against reality. Speed and craft aren't opposites; the loop between them — ship, observe, revise — is what produces craft over time.

**Applied → OMNIA:** A rough first pass at the Appearance settings, actually used, teaches you more about which of the ten settings matter than a month spent designing all ten in isolation.

### RULE 04 — Small Teams, Total Ownership

One person who owns a feature end-to-end will out-execute five people who each own one-fifth of it.

Elite technical units assign narrow, high-stakes problems to small teams — sometimes a single person — with total ownership and no hand-off. The person who designs the screen also has to make it survive contact with real data and real edge cases. That accountability produces sharper decisions than a committee ever will, because there's nowhere to hide a compromise.

**Applied → OMNIA:** Even building solo, apply this to yourself: own the Create flow's UX and its failure modes end-to-end, rather than treating "design" and "does it actually work" as two separate jobs.

### RULE 05 — Build Like Hardware, Ship Like Software

A UI revision should cost you as little as changing a component value on a breadboard.

Shenzhen's manufacturing ecosystem can turn a design change into a physical prototype within a day, because the whole supply chain is built for iteration, not perfection-on-the-first-try. Software has no excuse to be slower than hardware. If changing a screen requires a multi-week review cycle, the process — not the idea — is the bottleneck. Build your design system so a UI change is a cheap, fast, reversible experiment.

**Applied → OMNIA:** A shared component library and design tokens let you revise the Explore page's card layout in an afternoon instead of re-touching every screen that uses a card.

### RULE 06 — Trust Is the Real Feature of an Autonomous System

The moment an AI agent acts without asking, the interface's only job is to keep the user in command of what just happened.

This is the one philosophy here with no direct pre-AI precedent. When software only responded to clicks, trust was implicit. When software can create, modify, or delete on a user's behalf, the interface must constantly answer three questions: what is it doing, why, and how do I undo it. A product can have brilliant agents and still fail if people don't trust the UI's account of what those agents did.

**Applied → OMNIA:** Every agent should be able to state, in the Create or Yours view, what it just did and why — not just show the result.

---

## Part II — Method

Philosophy tells you why. Method is the repeatable sequence of steps that turns that belief into a decision, every single time you sit down to design something.

### METHOD 2.1 — The Musk Algorithm, Rewritten for UI Work

Elon Musk has described a five-step engineering algorithm used at SpaceX and Tesla. Applied word-for-word to interface design, **in strict order — never skip ahead:**

1. **Question every requirement.** Attach a name to it. "That's how it's usually done" is not a requirement — a person, a rule, or a real constraint is. Every field, screen, and confirmation dialog needs an owner and a reason.
2. **Delete the part or the process.** Try to remove the whole screen or step before you improve it. If you never add anything back after deleting, you probably aren't deleting enough.
3. **Simplify or optimize.** Only after step two. Optimizing something that shouldn't exist is the single most common design mistake.
4. **Accelerate cycle time.** Every process can go faster — but only once it's already been deleted and simplified. Shorten the loop between a design decision and real user reaction.
5. **Automate.** Automation is the last step, never the first. Automating a flow that still has unnecessary steps just makes the mistakes happen faster.

**Applied → OMNIA:** Create-flow friction, walked through all five steps: question whether each interview question is truly needed → delete any the agent can infer or default → simplify the wording of what's left → shorten the perceived wait with streaming feedback → only then automate field population.

### METHOD 2.2 — Apple's Method: Clarity, Deference, Depth

- **Clarity** — text is legible at every size, icons are precise, and every control signals what happens if it's pressed. For an AI product, clarity extends to confidence: say "likely" or "uncertain" in plain language, not a bare decimal a user has to interpret.
- **Deference** — the interface recedes so the content, including AI-generated content, is what the user is actually looking at, not the chrome around it.
- **Depth** — visual layering and motion convey hierarchy. For AI features, depth also means progressive disclosure: a simple surface with real sophistication available one layer down, exactly like OMNIA's Normal tier being simple on top of the same product that holds Enterprise's depth underneath.

### METHOD 2.3 — The Compressed Design Sprint

Silicon Valley's five-day sprint, compressed for a solo builder or a small team, run day by day:

1. **Map** — write the problem as a user goal, not a feature request.
2. **Sketch** — generate multiple divergent solutions on paper before touching a design tool.
3. **Decide** — pick one direction with a rationale you could defend to a stranger.
4. **Prototype** — build only enough fidelity to test that decision, not the whole feature.
5. **Test** — put it in front of real or representative users and watch, without explaining it to them.

### METHOD 2.4 — PPCEE — The Loop for Anything an Agent Does Autonomously

1. **Prompt** — capture intent in the user's language, not the system's.
2. **Preview** — show what will happen before it happens, wherever the action is non-trivial or hard to reverse.
3. **Confirm** — require one explicit, low-friction confirmation for consequential actions, not a rubber-stamp dialog nobody reads.
4. **Execute** — run it, with visible progress if it takes more than an instant.
5. **Explain** — afterward, state plainly what changed and why, in one sentence a non-technical user would understand.

This loop is mandatory for any action an agent takes on a user's behalf — it is the operational form of Rule 06.

### METHOD 2.5 — Red-Team Review

Before any design is considered done, it gets reviewed once from an adversarial angle: how would this be misread, misused, or broken by a confused, rushed, or bad-faith user? This is a different question from usability testing. Usability asks "can they do it." Red-teaming asks "what happens when it goes wrong or gets abused" — and it happens at design time, not after launch.

---

## Part III — Technique

Eight concrete techniques for AI-integrated screens. Each one is a direct, tactical answer to a philosophy or method above.

### 3.1 Progressive Disclosure

Show the minimum first; reveal depth on demand. OMNIA's Appearance menu should lead with font size and theme — the two settings almost everyone touches — while the other eight sit one tap deeper. The same pattern applies to the Create flow's guided interview: ask the smallest set of questions needed for a Normal-tier agent, and only surface Enterprise-tier's deeper configuration once that tier is chosen.

### 3.2 Latency Masking

An AI response is rarely instant; the UI's job is to make the wait feel accounted for, not empty. Use skeleton screens shaped like the eventual content rather than a generic spinner, stream tokens as they arrive so users see progress instead of a blank pause, and use optimistic UI for actions that almost always succeed — show the result immediately and quietly reconcile if it fails.

### 3.3 Explainability Affordances

A one-tap "why" available on any AI-made decision — for instance, why an agent received a particular score. State confidence in plain language ("likely," "uncertain") rather than a bare decimal. Show a diff view whenever an agent revises something a user made, so the change is visible rather than silently overwritten.

### 3.4 Navigation Techniques

Keep the primary structure to as few top-level destinations as the product truly has — for OMNIA, that's three: Explore, Create, Yours. Put global controls, like a hamburger menu, above the page title rather than inside it, so navigation and content are never visually fused together.

### 3.5 The Frictionless Auth Gate

A logged-out visitor sees exactly one sentence explaining what the product does and exactly one decision to make: log in or sign up — no preview of the app that leads to a dead end. Every field on that sign-up form should be able to defend its own existence under Rule 01.

### 3.6 Tier Differentiation Without Dark Patterns

Normal and Enterprise should read as two honestly different levels of capability, not a crippled version designed to frustrate people into upgrading. Show what Enterprise adds in concrete terms — more layers, deeper configuration — never by artificially degrading what Normal already does well.

### 3.7 Type, Color, and Grid

A restrained type scale — display, body, caption, not six sizes "just in case." A spacing system built from one unit multiplied consistently (an 8-point grid is a solid default). Light and dark themes built from the same token set, so neither is an afterthought.

### 3.8 Motion as Status, Not Decoration

Reserve animation for telling the user something true: a subtle pulse means the AI is thinking, a settle-into-place means something just finished, a shake means this needs attention. If a motion doesn't communicate a state change, it's decoration — and decoration is the first thing Rule 01's deletion step should remove.

---

## Part IV — Practice

Methods and techniques only hold up if they're practiced on a schedule. These are the recurring habits that make the rest of this document more than a document.

### PRACTICE 4.1 — The Weekly Critique

A recurring, scheduled review of work in progress, judged out loud against this doctrine's rules rather than personal taste — "does this pass Rule 01?" instead of "I like this better." Even working solo, write the critique down. The discipline of articulating why a design survived review is what makes the review real.

### PRACTICE 4.2 — Prompt-as-Spec Practice

Treat every prompt written for a Cursor AI framework as a design specification, not a casual ask: state the requirement, the constraint, and the rule from this doctrine it must satisfy — so AI-generated output gets checked against the same standard a human reviewer would use.

### PRACTICE 4.3 — Five-Person Hallway Testing

Before calling a flow finished, put it in front of five people who've never seen it and watch them attempt the task without help. Five is enough to catch most usability problems. Waiting for a "proper" study is usually just a way to delay finding out you were wrong.

### PRACTICE 4.4 — The Living Design Log

A running, dated record of design decisions and the reasoning behind them — a lightweight decision record for design, the same idea as an architecture decision record for code. When a decision gets questioned later, by an advisor, a defense panel, or future-you, the log is the answer.

### PRACTICE 4.5 — Defense-Day Rehearsal

Rehearse a project defense demo the way a launch team rehearses a launch: a scripted reset procedure, a known-good offline fallback, and at least one full dry run under real time pressure before the actual day.

---

## Part V — Policy

Everything above is a judgment call, made well or poorly. These seven are not judgment calls. They are the floor beneath every screen this doctrine ever produces.

### POLICY 5.1 — Accessibility Is Not Optional *(non-negotiable)*

Every screen meets WCAG 2.1 AA at minimum: sufficient contrast, full keyboard operability, real alt text. Not because a rubric requires it, but because Rule 02 says the interface is the whole product — and a product that excludes users isn't done.

### POLICY 5.2 — No Dark Patterns, Ever *(non-negotiable)*

No pre-checked upsells, no confirm-shaming, no hidden unsubscribe or delete flows. This is a hard line, not a style preference, regardless of what it might do for a conversion metric.

### POLICY 5.3 — Every Autonomous Action Must Be Previewable and Reversible *(non-negotiable)*

If an agent can create, modify, or delete something on a user's behalf, the interface must let the user see it coming and undo it after. There is no exception for "the AI is usually right."

### POLICY 5.4 — AI-Generated Content Must Be Labeled *(non-negotiable)*

Any agent output presented as content — a generated description, a recommendation, a score — carries a visible marker that it's machine-produced, so users are never misled into treating it as a human's work or an objective fact.

### POLICY 5.5 — Non-Functional Requirements Ship With the Feature *(non-negotiable)*

Security, reliability, scalability, and cost are part of the same design review as the feature itself, not a follow-up pass after launch. A feature that's beautiful but insecure isn't eighty percent done — it isn't done.

### POLICY 5.6 — The Five-Second Clarity Test *(non-negotiable)*

Nothing ships until a first-time viewer can state, within five seconds of seeing the screen, what it's for and what they can do on it. If they can't, it goes back to Rule 01 — not to a copy pass.

### POLICY 5.7 — Versioning and Rollback for UI, Not Just Code *(non-negotiable)*

Every meaningful UI change is revertible as cleanly as a code change. If a redesign can't be rolled back quickly when it tests poorly, Rule 03's promise of speed without risk is just words.

---

## Appendix A — The One-Page Checklist

Every rule above, condensed to one line each. **Run through this before calling UI work done**, before any review, and before a defense-day rehearsal.

### Philosophy

- [ ] Every field/screen has a named owner and reason (Rule 01)
- [ ] Treated the screen as the whole product, not a wrapper around the AI (Rule 02)
- [ ] Shipped a rough version instead of waiting for a polished one (Rule 03)
- [ ] One owner exists for this feature end-to-end (Rule 04)
- [ ] A UI change here can be made cheaply and fast (Rule 05)
- [ ] Every autonomous action explains itself afterward (Rule 06)

### Method

- [ ] Ran Question → Delete → Simplify → Accelerate → Automate, in that order
- [ ] Checked the screen against Clarity, Deference, Depth
- [ ] Ran Map → Sketch → Decide → Prototype → Test before building final fidelity
- [ ] Any agent action follows Prompt → Preview → Confirm → Execute → Explain
- [ ] Red-teamed the design for misuse before calling it done

### Technique

- [ ] Minimum-first, depth-on-demand for every settings surface
- [ ] Latency is masked with real content shapes, not a bare spinner
- [ ] A "why" is available for any AI-made decision
- [ ] Top-level navigation matches the true number of destinations
- [ ] Logged-out view is one sentence + one decision, nothing else
- [ ] Tier differences are additive, never artificial crippling
- [ ] Type scale, spacing unit, and theme tokens are consistent
- [ ] Every animation communicates a real state change

### Practice

- [ ] This week's critique happened and was written down
- [ ] Prompts for the AI framework are written as specs, not casual asks
- [ ] Five people outside your head have tried this flow
- [ ] The design log has an entry for this decision
- [ ] A defense-day dry run has been rehearsed under time pressure

### Policy

- [ ] Contrast, keyboard access, and alt text all pass
- [ ] No dark pattern exists anywhere in this flow
- [ ] Every agent action can be previewed and undone
- [ ] AI-generated content is visibly labeled as such
- [ ] Security, reliability, scale, and cost were reviewed with the feature
- [ ] A first-time viewer passes the five-second clarity test
- [ ] This change can be rolled back as cleanly as it shipped

---

## Appendix B — Reference Table — What to Steal From Each School

| School | Core Belief | One Thing to Steal Directly |
|--------|-------------|----------------------------|
| Silicon Valley | Learning speed beats planning quality | Ship weekly, even when it's small |
| Elon Musk / SpaceX & Tesla | Deletion beats optimization | The five-step algorithm, run in strict order |
| Apple | Restraint is the design | Clarity, Deference, Depth as a review checklist |
| Unit 8200 | Ownership beats process | One owner per feature, no hand-offs |
| Shenzhen | Iteration cost determines iteration speed | A design token system that makes change cheap |

---

**END OF DOCUMENT — PREPARED AS A REUSABLE STANDARD FOR OMNIA AND ANY AI-INTEGRATED WEB PRODUCT**

Field Manual v1 · Philosophy · Method · Technique · Practice · Policy

Canonical source for Cursor agents: `.cursor/rules/builders-blueprint.mdc` (actionable summary). Full doctrine lives in this file.
