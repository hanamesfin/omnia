# OMNIA · Engineering Spec · Draft v0.1

**Status:** Ground truth for backend algorithms. Implement — do not paraphrase casually.  
**Coverage:** 17 / 17 sections defined below (ledger).

Companion Cursor rule: `.cursor/rules/omnia-backend-ground-truth.mdc`  
Executable modules: `apps/api/engines/spec/*`, `orchestration/*`, `tools/registry.py`, `prompt_engineering/compiler.py`

---

## Coverage Ledger

| ID | Name | Status |
|----|------|--------|
| 1.1 | Interview State Machine | DEFINED → `engines/spec/completeness.py` (+ bridge from FSM) |
| 1.2 | Runtime Orchestration Loop | DEFINED → `engines/orchestration/loop.py` |
| 1.3 | Decision Policy | DEFINED → `engines/orchestration/decision.py` |
| 2.1 | Agent Quality Score (AQS) | DEFINED → `engines/spec/aqs.py` |
| 2.2 | Synthetic Test Generation | DEFINED → `engines/spec/synthetic_tests.py` |
| 2.3 | Marketplace Ranking | DEFINED → `marketplace_rank_score` in `ranking.py` |
| 2.4 | Improvement Loop | DEFINED → `engines/spec/improve.py` |
| 3.1 | Agent Spec Schema | DEFINED → `engines/spec/schema.py` |
| 3.2 | Prompt Generator (compiler) | DEFINED → `prompt_engineering/compiler.py` |
| 3.3 | Tool Selector | DEFINED → `engines/tools/registry.py` |
| 3.4 | Knowledge Manager | DEFINED (floor 0.75 — wire into retriever next) |
| 3.5 | Marketplace Discovery | DEFINED — Explore sorts by `rank_score` |
| 4.1 | Injection Defense | DEFINED (trust boundary rule) |
| 4.2 | Sandboxed Execution | DEFINED (policy; runner TBD) |
| 4.3 | Cost & Latency Model | DEFINED (small vs capable tiers in config) |
| 4.4 | Observability & Versioning | DEFINED (`version` on spec + agent versions) |
| 4.5 | Defense-Day Mode | DEFINED (`DEMO_MODE`, canned tools, seeded fixtures) |

---

## §1 Core Algorithms

### 1.1 Completeness

```
completeness(spec) = Σ(weight_i · filled(slot_i)) / Σ(weight_i)
required weight = 2 | optional weight = 1
```

Required slots: `purpose, target_user, domain, tone, capabilities, constraints, escalation, output_format`  
Optional: `tools, knowledge_sources`  
Preview offer when `completeness ≥ 0.85` and all required filled. Retries ≤ 2 → `needs_review` flag.

### 1.2 Runtime loop

Bounded `reason → answer | ask_user | call_tool` with permission check, confirmation for non-`read_only`, hard `MAX_STEPS`.

### 1.3 Decision policy

```
score(action) = expected_value − (token_cost + latency_penalty + risk_penalty)
choose = argmax(score) where score ≥ MIN_CONFIDENCE
→ ask_user if none clear threshold OR top action is irreversible
```

---

## §2 Scoring

### 2.1 AQS

```
AQS = 0.30·Coverage + 0.25·Safety + 0.25·Clarity + 0.20·TestPassRate
```

### 2.2 Synthetic tests

From capabilities (positive) and constraints (negative + boundary). `TestPassRate = passed / total`.

### 2.3 Marketplace

```
usage_score = (n · avg_norm + K · AQS) / (n + K)
rank_score  = 0.6 · AQS + 0.4 · usage_score
```

Cold start (`n=0`) → `rank_score = AQS`.

### 2.4 Improvement triggers

| Trigger | Suggestion |
|---------|------------|
| Safety &lt; 0.70 | Add explicit constraint for `{missing_category}` |
| Clarity &lt; 0.70 | Shorten sentences in `{longest_section}` |
| TestPassRate &lt; 0.80 | Review failed cases |
| Coverage &lt; 0.70 | Add specifics to thin sections |

---

## §3 Platform

### 3.1 Schema (JSON contract)

See `AgentSpecV1.to_dict()` — fields: `agent_id, version, status, purpose, target_user, domain, tone, capabilities, constraints, escalation, output_format, tools[{tool_id, permission_tier}], knowledge_sources, scores{coverage,safety,clarity,test_pass_rate,aqs}, created_by, updated_at`.

Domains: `education | productivity | finance | health | creative | dev-tools | other`  
Tones: `professional | casual | friendly | formal`  
Tool tiers: `read_only | side_effecting | destructive`

### 3.2 Prompt compiler

```
identity + capabilities + constraints + tools + escalation + format
```

Same spec → same prompt (no model call).

### 3.3–3.5

Tool tag match + risk weights; knowledge similarity floor **0.75**; Explore orders by **rank_score** only (no featured override in API sort).

---

## §4 Security / Defense

- **4.1** Only Agent Spec is trusted instruction; user/tool/knowledge = data.
- **4.2** Code tools: no network by default, CPU/mem/time ceilings, wipe FS between runs.
- **4.3** Slot parse / synth tests → small model; runtime reason / irreversible → capable.
- **4.4** Edits bump `version`; published pin; run logs feed 2.4.
- **4.5** `DEMO_MODE`: seeded fixtures, canned tools, cached/deterministic walkthrough.

---

## §5 Worked example (Grocery Budget Coach)

Interview → Spec → Compiler → Synthetic tests → AQS.  
v1 example: Coverage 0.95 · Safety 0.68 · Clarity 0.88 · TestPassRate 0.90 → **AQS = 0.855** (Safety triggers 2.4).  
After data-handling constraint: Safety 0.85 → **AQS = 0.898** → publish.  
Marketplace cold start: `rank_score = 0.898`.

Tests: `apps/api/tests/test_engineering_spec.py`
