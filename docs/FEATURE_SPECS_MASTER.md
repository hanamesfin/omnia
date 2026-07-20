# OMNIA — Feature Specifications (Master Doc)

Detailed specs for all **36** proposed features across three ideation rounds, folded into one doc and organized by discipline. Each covers: what it is, how it works technically, data/schema implications, and why it matters for OMNIA (no external dataset, Normal/Enterprise split, defense-day readiness).

**Stack:** Next.js / React / TypeScript / Tailwind · FastAPI · PostgreSQL + Redis + vector DB (production target; standalone often uses JSONL / in-memory).

**Related:** wave-1/2 notes in `OMNIA_NEXT_FEATURES.md`. This file is the canonical 36-feature master.

---

## Status matrix

| ID | Feature | Status | Notes |
|---|---|---|---|
| **B1** | Event-sourced lifecycle | **Partial** | JSONL log, project, truncate, `/history`. Missing: Postgres, Redis cache, snapshot-N, `POST …/rollback/{event_id}` |
| **B2** | Shadow evaluation | **Partial** | Synthetic suite + AQS on generate. Missing: tables, auto-rerun on `edited` |
| **B3** | Cost-governed router | **Partial** | Step/loop budgets. Missing: `max_cost_per_run`, tier downgrade, cost `run_ledger` actions |
| **B4** | Agent DNA & remix | **Shipped** | Fingerprint + similar/lineage/remix (hash/Jaccard; vector column next) |
| **B5** | Tenant isolation | **Partial** | Redis/schema helpers. Missing: provision, vector namespace, multi-schema migrate |
| **B6** | Semantic version diffs | **Shipped** | Layer diffs + history `last_diff` |
| **B7** | Capability contracts | **Not started** | Needed for F7 / E7 / E9 |
| **B8** | Shadow deployment / twin | **Not started** | |
| **B9** | Circuit-breaker mesh | **Not started** | |
| **F1** | Live interview preview | **Not started** | |
| **F2** | Architecture graph | **Partial** | `EnterpriseArchitectureGraph` toggles. Missing: react-flow drag/edges |
| **F3** | Cmd+K scaffolding | **Not started** | |
| **F4** | Guide onboarding agent | **Shipped** | Seed Guide + Discover featured |
| **F5** | Live test-drive split | **Partial** | Config ‖ chat after save. Missing: uncommitted simulate |
| **F6** | Version timeline | **Partial** | Scrubber + diffs. Missing: restore → rollback |
| **F7** | Multi-agent composition | **Not started** | Depends on B7 |
| **F8** | Mobile companion | **Not started** | |
| **F9** | Contextual empty states | **Not started** | |
| **D1** | Deterministic avatars | **Partial** | Logo/motif system. Missing: pure config-hash SVG seed |
| **D2** | Tier as visual language | **Partial** | Create motion. Missing: Explore card shadow tokens |
| **D3** | Reasoning motion | **Partial** | `OrchestrationProgress`. Missing: five-node layer SVG |
| **D4** | Specialization colors | **Shipped** | `specialization-colors.ts` |
| **D5** | Tier level-up motion | **Shipped** | `TierUpgradeMotion` |
| **D6** | Shape-coded complexity | **Shipped** | `ComplexityMark` |
| **D7** | Trust-tier badges | **Not started** | Distinct from capability tier |
| **D8** | Depth-aware dark mode | **Not started** | Completes D2 for dark theme |
| **D9** | Generative empty art | **Not started** | Reuses D1 |
| **E1** | Agent report card | **Shipped** | `AgentReportCard` |
| **E2** | Sandbox graduation | **Not started** | |
| **E3** | Enterprise co-creation | **Not started** | |
| **E4** | Remix attribution | **Shipped** | `RemixAttribution` |
| **E5** | Drift nudges | **Partial** | `/drift` + banner. Missing: scheduled job |
| **E6** | Failure post-mortem | **Shipped** | Layer taxonomy + UI |
| **E7** | Conversation handoff | **Not started** | Depends on B7 |
| **E8** | Progressive user trust | **Not started** | |
| **E9** | Graceful retirement | **Not started** | Depends on B7 / E4 / F7 |

**Counts:** Shipped **9** · Partial **11** · Not started **16** · Total **36**.

---

## BACKEND

### B1. Event-Sourced Agent Lifecycle

**What it is:** Store every agent as an append-only sequence of events rather than a single mutable row. Current state is a fold over its event history.

**Schema:**
```
agent_events
  id            uuid pk
  agent_id      uuid
  event_type    enum       -- created, edited, evaluated, evolved, deployed, retired
  payload       jsonb
  actor_id      uuid
  created_at    timestamptz
```

**Mechanics:** Replay or snapshot+diffs; snapshot every N; Redis caches computed state by `agent_id`, invalidated on write.

**API:** `GET /agents/{id}` from cache/snapshot; `GET /agents/{id}/history`; `POST /agents/{id}/rollback/{event_id}` appends reconstruct event (never deletes).

**Why OMNIA:** Demo-reset = truncate after checkpoint; rollback + audit + reset in one mechanism; reproducibility for defense Q&A.

**Code today:** `engines/lifecycle/events.py`.

---

### B2. Self-Generated Shadow Evaluation

**What it is:** Rule-based synthetic regression suite from specialization — no trained scorer, no external dataset.

**Mechanics:** Template map specialization → prompts + deterministic rubrics; re-run on every `edited`; store as `evaluated` event.

**Schema:** `shadow_tests`, `shadow_test_runs`.

**Why OMNIA:** Core answer to “how do you know quality?”; score trend across B1 versions.

**Code today:** Synthetic suite / AQS on generate.

---

### B3. Cost-Governed Orchestration Router

**What it is:** Budget ceiling + reliability tier between plan step and LLM/tool call.

**Mechanics:** `max_cost_per_run` + `fast|balanced|thorough`; allow / downgrade / `budget_exceeded`; hard loop cap.

**Schema:** `run_ledger` (step, cost_estimate, cumulative, action).

**Why OMNIA:** Stops Enterprise tool loops without a trained safety net.

---

### B4. Agent DNA & Remix Lineage

**What it is:** Config fingerprint / vector for similar agents + parent→child forks.

**Schema (target):** `parent_id`, `config_vector`; recursive lineage.

**Mechanics:** Deterministic material from structured fields; fork copies then diverges via B1; Explore “similar.”

**Why OMNIA:** Ecosystem genealogy; demo “how agents evolve.”

**Code today:** `engines/lineage/dna.py` + remix/similar/lineage APIs.

---

### B5. Tenant-Isolated Enterprise Workspaces

**What it is:** Schema-per-tenant Postgres + namespaced Redis + vector collection per Enterprise tenant.

**Mechanics:** Provision `tenant_{id}`; Redis prefix; migrate all tenant schemas.

**Why OMNIA:** Concrete compliance isolation answer.

**Code today:** `engines/tenancy/isolation.py`.

---

### B6. Semantic Diffing Between Agent Versions

**What it is:** Structured layer diffs on edit (`{layer, change, detail}`), stored on the event.

**Why OMNIA:** Powers F6; explains behavior shifts.

**Code today:** `engines/lineage/diff.py`.

---

### B7. Agent Capability Contracts

**What it is:** Typed, versioned I/O schema per agent so agents can call other agents as tools safely.

**Schema:**
```
agent_contracts
  id            uuid pk
  agent_id      uuid
  version       int
  input_schema  jsonb
  output_schema jsonb
  deprecated_at timestamptz null
```

**Mechanics:** Validate call against B’s `input_schema` and response against `output_schema` before returning to A; old versions remain callable until dependents migrate (hooks E9).

**Why OMNIA:** Foundation for F7 composition canvas and E7 handoff — type-safe composition, not prompt-stitching.

**Status:** Not started. Skip for single-agent defense unless showing F7/E7.

---

### B8. Shadow Deployment / Agent Twin Testing

**What it is:** Edited candidate runs as a silent twin on mirrored live inputs; outputs diffed before promote.

**Schema:** `shadow_deployments`, `twin_run_diffs`.

**Mechanics:** Async mirror (non-blocking); after sample/time window, aggregate regression + B2 score delta; then commit live B1 event.

**Why OMNIA:** Second quality signal beyond synthetic tests when no external dataset exists.

---

### B9. Circuit-Breaker Mesh for Tool Calls

**What it is:** Per-tool platform-wide circuit breaker wrapping external calls.

**Mechanics:** Rolling failure rate; `closed → open → half-open`; Redis `circuit:{tool_id}`.

**Why OMNIA:** Isolates flaky integration blast radius — reliability NFR answer.

---

## FRONTEND

### F1. Live Preview Panel During Interview

Debounced cheap preview from partial answers; `InterviewState` with `previewStatus` / `previewMessage`. Cuts abandonment; strong demo moment.

### F2. Interactive Architecture Graph (Enterprise)

Draggable seven-layer node graph (`react-flow`); edges = dependencies; click edits layer payload into F1 state.

**Code today:** Toggle graph (not full react-flow).

### F3. Cmd+K Natural-Language Scaffolding

Deterministic parser (regex/keywords) → pre-fill interview; low confidence → blank, never fabricate.

### F4. Meta Onboarding — Guide Agent

Real OMNIA agent walks Create; featured on Discover — **shipped**.

### F5. Live Test-Drive Split View

Config left / chat right; target = local uncommitted simulate; commit = B1 `edited`.

**Code today:** Split after save on Yours Personalize/Update.

### F6. Visual Version Timeline

Scrub B1 history; show B6 diffs; restore via rollback API.

**Code today:** Scrubber + diffs; restore open.

### F7. Multi-Agent Composition Canvas

Nodes = `agent_id`s; edges validated live against B7 contracts; save = pipeline entity with its own event history.

**Depends on B7.** Second-phase / ecosystem proof.

### F8. Mobile Companion View

Responsive monitor + approve HITL steps; push on `pending_approval`; resume via B3 ledger. Enterprise human-in-the-loop + mobile coursework thread.

### F9. Contextual Empty States That Teach

Rules over `has_created_agent` / published / forked / tier — cheap first-session clarity.

---

## DESIGN

### D1. Deterministic Generative Avatars

Hash `{specialization, tier, tool_count, layer_flags}` → SVG params; regen on meaningful B6 changes.

### D2. Tier as Visual Language

Normal flat vs Enterprise layered shadows via design tokens on one `AgentCard`.

### D3. Branded Reasoning Motion

Five-node layer SVG from SSE step events; `prefers-reduced-motion` → static list.

### D4. Specialization Color Taxonomy — **shipped**

### D5. Leveling-Up Tier Transition — **shipped**

### D6. Shape-Coded Complexity — **shipped**

### D7. Trust-Tiers Badge System

Axis **orthogonal** to Normal/Enterprise: `experimental` → `community` → `verified` from B2 history (+ B8 twin health). Separate visual channel from D2 depth.

### D8. Depth-Aware Dark Mode

Enterprise depth via inset highlight / border tokens in dark theme (drop shadows fail on dark). Same semantic token, theme-swapped.

### D9. Generative Empty-State Illustrations

D1 engine with placeholder seed — one visual system for agents and empties.

---

## EXPERIENCE

### E1. Agent Report Card — **shipped**

### E2. Sandbox-to-Graduation Pipeline

`draft → sandboxed → eligible → live`; Publish gated on B2 threshold.

### E3. Live Co-Creation for Enterprise

WebSocket `interview:{session_id}`; LWW; presence. Enterprise-only.

### E4. Remix Attribution — **shipped**

### E5. Proactive Drift Nudges — **partial** (on-demand; job next)

### E6. Guided Failure Post-Mortem — **shipped**

### E7. Cross-Agent Conversation Handoff

Plan declares `handoff_candidates` via B7; low per-turn confidence → suggest handoff; pack history to target input schema.

### E8. Progressive Trust Unlocking

`user_trust_level` unlocks tools/Enterprise eligibility via deterministic rules; UI explains locks.

### E9. Graceful Agent Retirement Flow

`deprecated_at` + grace; notify remixed dependents + F7 pipelines; suggest replacement by specialization + D7 trust; freeze read-only after grace.

---

## Dependency map (round-3 highlights)

```
B7 contracts ──► F7 composition canvas
             ├──► E7 conversation handoff
             └──► E9 retirement (contract deprecation)

B8 twin testing ──► D7 verified trust tier
B2 shadow eval  ──► D7 / E2 / E5

D1 avatars ──► D9 empty illustrations
D2 tier depth ──► D8 dark-mode depth tokens

B1 + B6 ──► F6 timeline / rollback
B3 + B9 ──► safe live orchestration demos
```

---

## Quick-reference build order (defense timeline)

1. **B1 deepen** — rollback, snapshots, Redis cache (unlocks F6 restore; foundation for B8)
2. **B2 deepen** — shadow tables + rerun on `edited` (unlocks E2, E5 job, D7)
3. **F1 or F5 deepen** — highest visual ROI per hour
4. **D1 + D2** (+ **D8** if theming is on stage) — cheap polish
5. **B3 + B9** — before live LLM orchestration demos
6. **B7** — only if also showing **F7** or **E7**; otherwise skip for defense
7. Then: F3, F9, E2, E8, D7, B8, E3, F8, E9 as time allows

---

## How the pieces reinforce each other

```
Create (F2 / F1 / F3) → generate (E1 + B2)
  → B1 events → edit (B6) → B2 re-eval → E5 / D7
    → F5 test-drive → F6 timeline
      → E2 graduation → publish → Explore (B4 / E4 / D4–D7)
        → run (B3 + B9) → E6 post-mortem
          → [optional] B7 → F7 pipelines / E7 handoff / E9 retirement
```

Enterprise adds B5 isolation, E3 co-create, F8 companion, deeper F2 graph.
