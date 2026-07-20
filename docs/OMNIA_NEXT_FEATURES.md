# OMNIA Next Features — Defense-ready specs

Three high-ROI features tied to create → evolve → evaluate, no external dataset, and Normal / Enterprise split.

**Canonical catalog of all 36 specs + status:** [`FEATURE_SPECS_MASTER.md`](./FEATURE_SPECS_MASTER.md)

Related code:
- Event log: `apps/api/engines/lifecycle/events.py`
- Architecture graph: `apps/web/src/components/EnterpriseArchitectureGraph.tsx`
- Report card: `apps/web/src/components/AgentReportCard.tsx`
- Wired into Create: `apps/web/src/app/create/page.tsx`

---

## 1. Event-sourced agent lifecycle (backend)

### Problem
Current agent rows are mutable snapshots. Demo reset and audit rely on fragile full wipes; rollback of a bad edit is hard to defend.

### Model

Append-only events (JSONL locally; Postgres table in production):

| `type` | When | Payload (examples) |
|---|---|---|
| `agent.created` | Generate succeeds | name, create_tier, aqs, tools, model_id |
| `agent.edited` | Personalize / Update | changed fields |
| `agent.evaluated` | Eval / synthetic suite | aqs, pass_rate |
| `agent.evolved` | Advance | focus, delta |
| `agent.published` / `unpublished` | Marketplace | listing_id |
| `agent.archived` | Soft delete | reason |
| `agent.logo_set` / `agent.rated` | UI actions | motif / stars |

Each event: `event_id`, `agent_id`, `actor_id`, `timestamp`, `sequence`, `payload`.

### Operations

- **Append** on create / publish (already hooked in `standalone.py`)
- **`project_agent(agent_id)`** — rebuild minimal state by replaying events (audit / rollback preview)
- **`truncate()`** — demo reset to event zero (also called from `seed/demo_reset.py`)

### Defense one-liner
“We don’t only store the latest agent row — we keep an append-only lifecycle log, so audit, rollback, and demo reset are replay, not a custom wipe script.”

### Next (optional)
- Persist events in Postgres beside `Agent`
- Expose `GET /agents/{id}/history`
- Sandbox graduation: only allow `agent.published` if last `agent.evaluated` AQS ≥ threshold

---

## 2. Interactive Enterprise architecture graph (frontend)

### Problem
Enterprise Create looks like “Normal + uploads.” The seven-layer story must be *visible*.

### UI
`EnterpriseArchitectureGraph` renders:

Brain → Prompt → {Knowledge, Memory, Tools} → Plans → Eval → (feedback to Brain)

- Click toggles optional layers (Knowledge stays on — generate gate)
- Live count “N / 7 live”
- Depth / glow treatment matches Enterprise visual language

Shown on Create when `create_tier === "enterprise"`.

### Defense one-liner
“Enterprise isn’t a badge — you wire the seven-layer stack on a graph before generate.”

### Next (optional)
- Persist toggled layers onto `requirements` / session
- Live preview: dim edges when a layer fails health check
- Drag-to-reposition with saved layout

---

## 3. Agent report card on generate (experience)

### Problem
“Your agent is ready!” hides tradeoffs. Panelists ask how quality is known without an external dataset.

### UI
`AgentReportCard` after generate:

- Letter grade from AQS
- Tier (Normal / Enterprise) + capability tier
- Reliability from synthetic test pass rate
- Estimated cost / run (heuristic from tool count)
- Breakdown bars: Coverage, Safety, Clarity, Test pass rate
- Model fit + linter status

Data already returned by `/agents/generate`: `aqs`, `synthetic_tests`, `model_score`, `lint_passed`, `tools`, `create_tier`.

### Defense one-liner
“Every agent ships with a nutrition-label report card scored by deterministic AQS and self-generated synthetic tests — no external dataset.”

### Next (optional)
- Block Publish until grade ≥ B (sandbox → graduation)
- Compare report cards across Advance versions

---

## How the three reinforce each other

```
Create (Enterprise graph)
    → generate
        → report card (AQS + synthetic)
            → append agent.created event
                → publish → agent.published event
                    → Explore (quality floor via eval threshold)
```

Demo reset: truncate event log + knowledge + stats + Postgres (DEF-02).

---

## Suggested demo script (2 minutes)

1. Start **Enterprise** Create → show architecture graph  
2. Upload knowledge → generate  
3. Point at **report card** (AQS grade, synthetic pass rate, cost)  
4. Publish → mention lifecycle event `agent.published`  
5. Optional: show projected history / demo-reset as replay-to-zero

---

# Wave 2 — DNA, Guide, timeline, drift

Twelve features (Backend ×3, Frontend ×3, Design ×3, Experience ×3).

## Backend

### Agent DNA & remix lineage
- `engines/lineage/dna.py` — deterministic fingerprint + Jaccard similarity
- APIs: `GET /agents/{id}/similar`, `GET /agents/{id}/lineage`, `POST /agents/{id}/remix`
- Generate stores `dna` / `parent_agent_id` / `remix_depth`; interview accepts `remix_parent_id`

### Tenant-isolated Enterprise workspaces
- `engines/tenancy/isolation.py` — `redis_key(tenant, …)`, `postgres_schema_name`, `search_path_sql`
- Phase 1 helpers shipped; schema-per-tenant rollout is ops/Postgres next

### Semantic version diffs
- `engines/lineage/diff.py` — layer-aware diffs (brain / prompt / knowledge / tools / eval …)
- Edits append `agent.edited` with `diff` payload; `GET /agents/{id}/history` returns versions + last_diff

## Frontend

### Guide meta-onboarding agent
- Seed `agent-seed-guide` (“Guide”) — featured on Discover; teaches Create / Discover / Yours

### Live test-drive split view
- Yours Personalize / Update: config left, live chat right (no regenerate)

### Visual version timeline
- `VersionTimeline` scrubber over history + semantic diff summary

## Design

### Specialization color taxonomy
- `lib/specialization-colors.ts` — hue families by domain/kind on Discover cards

### Tier level-up motion
- `TierUpgradeMotion` + `ComplexityMark` on Create when switching Normal → Enterprise

### Shape-coded complexity
- Single node (Normal) vs connected cluster (Enterprise) for accessibility

## Experience

### Remix attribution chain
- Remix clones preserve credit trail; shown on Explore + Yours via `RemixAttribution`

### Proactive drift nudges
- `engines/ops/drift.py` + `GET /agents/{id}/drift` + `DriftNudgeBanner` on Yours

### Guided failure post-mortem
- `engines/ops/postmortem.py` + `POST /agents/{id}/postmortem` + `FailurePostMortem` UI

## Demo script (wave 2, ~3 min)

1. Discover → **Guide** (featured) → open chat  
2. Remix a public agent → show attribution chain → Yours  
3. Personalize with **live test-drive** split  
4. Scrub **version timeline**; mention semantic diff  
5. Trigger / show **drift nudge** + failure **post-mortem**  
6. Create → switch to Enterprise → **tier level-up** motion + shape mark  
