# OMNIA — Full QA Sweep Report (Phase 0–4)

**Date:** 2026-07-21 (full re-run)  
**Environment:** Live `standalone` API (`:8000`, `demo_mode=true`) + Next.js web (`:3000`)  
**Method:** Code inventory + live HTTP + browser (Discover empty state) + `pytest tests/test_defense_priority.py` (18 passed)  
**Not run (destructive / long):** Full Normal+Enterprise LLM generate success; live `demo_reset.py` wipe of the running store

---

## 1. Phase 0 — Feature inventory

| Feature | Status | Notes |
|---|---|---|
| Discover / Explore (`/explore`) | **Present** | Featured Guide + Trending; marketplace API auth-required |
| Create guided interview + Architect | **Present** | `/interview/start|answer`; `/create` |
| Yours library (`/yours`, `/yours/[id]`) | **Present** | List + studio (personalize / update / chat) |
| Normal vs Enterprise tier | **Present** | `create_tier` on interview session; tools/knowledge gates server-side |
| Seven-layer Enterprise graph | **Present** | Brain, Prompt, Knowledge, Memory, Tools, Plans, Eval |
| Appearance (~10 settings) | **Present** | Font scale/family, density, message style, sidebar×3, reduce motion + **10 themes** |
| Language (~14 locales) | **Present** | `/language`; 14 ids in `i18n.ts` (en…ru) |
| Auth / account | **Present** | Demo login, register (`display_name`), OAuth providers, `/account`, sign-in/up |
| Generation (AQS / synthetic / no external dataset) | **Present** | `engines/spec/synthetic_tests.py`; report card path |
| Cursor AI integration | **Present** | Tool + `/integrations/cursor`; status `configured=false` without sdk/key |
| Remix / DNA / lineage / history | **Present** | Wave-2 APIs under `/agents/{id}/…` |
| Drift / post-mortem | **Present** | `engines/ops/*` |
| Lifecycle events | **Present** | `engines/lifecycle/events.py` |
| Knowledge / Evaluations / Activity / Help | **Present** | Routes + menu |
| Product apps (`/app/[id]`) | **Present** | Extra vs original expected list |
| Agent DELETE / archive API (standalone) | **Missing** | DELETE → **405**; status/event types exist; no public wipe endpoint |
| Interview persistence across browser refresh | **Partial** | Server holds `session_id` in memory; Create UI does **not** persist it to `localStorage`/`sessionStorage` |

### Expected-set cross-check

| Expected | Result |
|---|---|
| Explore browse | Found — live Discover shows Guide + listings |
| Create + Architect (no repeat-question) | Found — **Pass** (5 unique turns) |
| Yours | Found — 18 agents for demo admin |
| Tier Normal/Enterprise + layers | Found — knowledge gate + tool strip |
| Appearance ~10 | Found |
| Language ~15 | Found (**14** locales) |
| Auth | Found |
| No external dataset | Found (synthetic suite) |
| Cursor AI | Found (env not configured) |
| Wave-1/2 extras | Found |

**Present but not in original expected list:** Cursor AI, Guide seed agent, DNA/remix, version timeline, drift, post-mortem, report card, product factory apps, email/translate/speech tools.

---

## 2. Phases 1–4 — Pass/Fail table

| Phase | Check | Status | Notes |
|---|---|---|---|
| P0 | API `/health` | **Pass** | `demo_mode` + `standalone` |
| P0 | Web core routes HTTP | **Pass** | `/explore` `/create` `/yours` `/language` `/account` `/integrations/cursor` `/knowledge` `/evaluations` `/activity` `/help` `/sign-in` → 200 |
| P0 | Defense unit suite | **Pass** | `18 passed` in 11.8s |
| P1 | Demo login + `/me` | **Pass** | `admin@demo.com` |
| P1 | Register second account | **Pass** | Requires `display_name` (422 without it) |
| P1 | Marketplace list (authed) | **Pass** | 12 listings; unauthed → 401 |
| P1 | Guide on Discover | **Pass** | API + browser featured “Guide” |
| P1 | Yours library | **Pass** | n=18 |
| P1 | Interview start | **Pass** | Session issued |
| P1 | Architect questions change with answers | **Pass** | 5/5 unique questions across turns |
| P1 | Cursor status API | **Pass** | `configured=false`, sdk/key unset (expected) |
| P1 | Agent history / similar / drift | **Pass** | All 200 |
| P1 | Synthetic tests module | **Pass** | Present; no external dataset dependency |
| P1 | Full Normal+Enterprise LLM generate | **Not run** | Latency / cost; gates verified instead |
| P2 | Interview resume same `session_id` | **Pass** | Server memory |
| P2 | Interview after **browser refresh** | **Fail / High** | No client persistence of `session_id` → user loses mid-Create flow |
| P2 | Unknown `session_id` | **Pass** | HTTP 404 |
| P2 | Empty / Arabic / long answers | **Pass** | Codes 200/200/200 |
| P2 | Enterprise generate without knowledge | **Pass** | 400 `Enterprise Create requires at least one processed knowledge document…` after ready |
| P2 | Double-submit generate (incomplete) | **Pass** | Both rejected before create |
| P2 | Delete agent / second-tab | **Partial** | DELETE → **405**; no graceful archive path |
| P2 | Explore zero-result empty state | **Pass** | Browser: “No exact match yet” + Create CTA |
| P2 | Marketplace `?q=` server filter | **Partial** | API returns full list; UI filters client-side |
| P3 | Fake agent ID | **Pass** | 404 |
| P3 | Cross-account private agent | **Pass** | Second user → 404 `agent.not_found` |
| P3 | Tier entitlement server-side | **Pass** | `create_tier` not on `GenerateIn`; session-owned; defense tests |
| P3 | Interview rate limit | **Pass** | 429 after burst (~17 starts / 60s window) |
| P3 | Generate rate limit | **Pass** | `create_limiter` 8/60s in code |
| P3 | Injection in personalize | **Pass** | Stored as text (200); React escapes XSS |
| P4 | Demo reset coverage (code) | **Pass** | Drops PG tables; `clear_all` knowledge; event `truncate`; stats file wipe |
| P4 | Demo reset Redis | **Partial** | Script does **not** mention Redis (standalone path may not use it) |
| P4 | Live demo_reset execution | **Not run** | Destructive on shared demo store |
| P4 | Offline Discover seeds | **Pass** | `SEED_LISTINGS` fallback when API offline |
| P4 | Marketplace N+1 | **Partial** | Fine in in-memory standalone; watch Postgres path later |

---

## 3. Prioritized bug list

### Critical
_None found in this sweep._

### High
1. **Create interview lost on browser refresh** — `session_id` lives only in React state; server session is unreachable after reload. Defense-day risk if an evaluator refreshes mid-Architect.

### Medium
2. **No standalone agent DELETE/archive API** — DELETE returns 405; second-tab “deleted agent” scenario cannot be exercised cleanly.  
3. **Cursor AI not configured in env** — status correctly reports `configured=false`; Integrations page is present but non-functional until `cursor-sdk` + `CURSOR_API_KEY`.  
4. **Marketplace search is client-only** — `GET /marketplace/?q=` ignores query; empty state works in UI but API search is incomplete.

### Low
5. **Register schema requires `display_name`** — easy to miss if clients send `name` only (422).  
6. **Language count is 14, not ~15** — cosmetic vs expected list.

---

## 4. Defense-day risk (ranked by likelihood)

| Likelihood | Risk | Why it surfaces |
|---|---|---|
| **High** | Mid-Create refresh loses interview | Natural evaluator habit; looks like a broken Architect |
| **Medium** | Demo Cursor page says “not configured” | Easy to open from menu; looks unfinished |
| **Medium** | No delete/archive story | Panel asks “how do we retire an agent?” |
| **Low** | Rate-limit 429 during rapid Create demos | Burst interview starts in same minute |
| **Low** | Enterprise without upload blocked | Correct behavior — rehearse the knowledge-upload beat so it looks intentional |

**What held up well:** Architect advance (no repeat-question), Enterprise knowledge gate, cross-account isolation, interview rate limit, Discover empty state, Guide featured on Discover, defense pytest suite (18/18).

---

## 5. Method notes / gaps

- Full end-to-end **Normal + Enterprise generate with LLM** was not executed; generation **gates** were verified live.  
- `demo_reset.py` was **traced**, not executed against the live store.  
- Appearance compactness was not re-browser-tested in this pass (prior fix still in tree).
