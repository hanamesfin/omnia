# OMNIA — Build Spec Compliance Matrix (Defense-Ready)

**Date:** 2026-07-22  
**Spec:** `docs/OMNIA_BUILD_SPECIFICATION.html` · Rev 1.0 (OM–00 … OM–10 + Appendix A/B)  
**Code:** `apps/web` · `apps/api`  
**Live web:** https://omnia-wine.vercel.app  
**Live API:** https://omnia-api-ten.vercel.app (`/health` → `demo_mode: true`, `standalone: true`)  
**Prior quality audit:** `docs/APPENDIX_A_AUDIT_2026-07-22.md`  
**Recent ship:** `77933e4` — OM–03 AuthGate (landing only until signed in; no silent demo-login)

**Status legend:** **Done** · **Partial** · **Missing**

Capstone constraints (solo defense date, no external training dataset, Vercel serverless demo) are noted where they legitimately bound depth — they do **not** turn Missing into Done.

---

## Summary counts

| Status | Sections (OM–00…10 + App A/B) |
|--------|------------------------------:|
| **Done** | **2** |
| **Partial** | **11** |
| **Missing** | **0** |
| **Total** | **13** |

| Section | Status |
|---------|--------|
| OM–00 Operating Philosophy | Done |
| OM–01 Requirements | Partial |
| OM–02 UI / UX System | Partial |
| **OM–03 Home, Login & Sign-Up Gate** | **Done** |
| OM–04 Frontend Architecture | Partial |
| OM–05 Backend Architecture | Partial |
| OM–06 Feature Set | Partial |
| OM–07 Experience Design | Partial |
| OM–08 Quality & Operations | Partial |
| OM–09 Title → Agent Pipeline | Partial |
| OM–10 Defense Readiness & Roadmap | Partial |
| Appendix A Quality Audit | Partial |
| Appendix B Stack & Glossary | Partial |

---

## OM–00 · Operating Philosophy — **Done**

Five-lens ladder (Philosophy → Policy) is documented in the Rev 1.0 HTML and visibly encoded in product decisions.

- Spec + ladder live in `docs/OMNIA_BUILD_SPECIFICATION.html` (§ OM–00); defense can open the HTML as the “why” artifact.
- Apple / three-destination freeze: Discover / Create / Yours only in `apps/web/src/components/AppMenu.tsx` (no fourth primary tab).
- Identity-before-capability policy enforced by OM–03 (`AuthGate`, landing with no greyed tabs).
- 8200 / “no external dataset” → deterministic composite scoring in API eval engines + `AgentReportCard` (not a trained ranker).
- Shenzhen / critique: generate path includes critique/refine (`apps/api/standalone.py` chat-create critique; Product Factory critic in `engines/product_factory/pipeline.py`).

---

## OM–01 · Requirements — **Partial**

Personas and core page jobs largely ship; several non-functional and success-metric items are thin or uninstrumented.

- **Create / Yours / Explore** exist live (`/create`, `/yours`, `/explore`) with tiered Create, library, search/filters, publish.
- Versioning story exists: `version_history` in standalone store + `VersionTimeline` on `apps/web/src/app/yours/[id]/page.tsx` (`GET /agents/{id}/history`).
- Session auth on app routes: **Done** via OM–03; API `require_perm` + `tier_gate.py` for Enterprise tool stripping.
- **Gaps:** Explore “flag/report misuse” path not found; success metrics (time-to-first-agent, reuse rate) not tracked; live demo is in-memory standalone (not full Postgres persistence story); cost ceiling / quotas exist as rate limits, not a morning-of cost dashboard.
- Accessibility bar deferred to OM–02 and remains Partial (no formal WCAG report).

---

## OM–02 · UI / UX System — **Partial**

HIG mapping (clarity / deference / depth) shows in chrome and Create progress; Appearance/Language and states are incomplete vs the ten/fifteen-control tables.

- Deference: hamburger / sidebar chrome in authenticated shell only; landing has no nav (`AppShell.isGateChromePath`, `page.tsx` landing).
- Design system: theme tokens + 10 themes (`AppearanceProvider` / themes); font scale, density, reduce-motion, dyslexic font in `appearance-prefs.ts` + `AppearanceControls.tsx`.
- Language: `/language` + i18n + RTL for Arabic — **not** the full 15-control language matrix (date/time/units/currency/etc. missing).
- Empty/loading: Explore “No exact match”, Yours empty CTA, Create interview progress — good; **no** `error.tsx` / `global-error.tsx` for “something broke.”
- Missing vs OM–02 list: dedicated high-contrast mode, corner sharpness, Explore/Yours grid-list default, formal AA contrast audit.

---

## OM–03 · Home, Login & Sign-Up Gate — **Done**

**Callout for defense:** this section is shipped as specified. Commit `77933e4`.

- Single root gate: `apps/web/src/components/AuthGate.tsx` — unauthenticated non-public → `/`; authenticated on `/` → `/explore` (or `returnTo`).
- Landing only until signed in: `apps/web/src/app/page.tsx` — brand, one hero (“Describe an agent. OMNIA builds it.”), Sign up / Log in; **no** hamburger, tabs, or preview of Explore/Create/Yours.
- Public allowlist: `apps/web/src/lib/auth-session.ts` (`/`, `/sign-in`, `/sign-up`, `/auth/callback`, `/privacy`, `/terms`); chrome stripped on gate paths in `AppShell.tsx`.
- **No silent demo-login:** `ensureAuth()` returns JWT only; `demoLogin()` is explicit user-gesture API (`apps/web/src/lib/api.ts`).
- Session expiry: soft redirect with “Your session ended…” banner + `returnTo` / post-auth destinations (sign-up → Explore, sign-in → prior route or Yours).

---

## OM–04 · Frontend Architecture — **Partial**

Stack matches; folder/state/streaming architecture diverges from the proposed `(public)/(app)` + React Query + SSE diagram.

- Next.js App Router + React + TypeScript + Tailwind in `apps/web` — live on Vercel.
- Auth plugged at shell layout via `AuthGate` (not route-group middleware as drawn; behavior matches the intent).
- Create progress: **poll** `/agents/generate/progress` from `create/page.tsx` — not a dedicated `useGenerationStream` SSE hook + Zustand generation store.
- No React Query / Zustand as specified; server fetches are hand-rolled in `lib/api.ts`.
- Frontend unit/E2E (Jest / Playwright) for auth gate + Create path: **not found** under `apps/web`. Route `loading.tsx` skeletons exist.

---

## OM–05 · Backend Architecture — **Partial**

FastAPI surface and security primitives are real; live deploy is **standalone** (not the full Postgres + Redis job-graph topology on Vercel).

- Live API healthy: `GET https://omnia-api-ten.vercel.app/health` → `ok` / `standalone` / `demo_mode`.
- Auth: register/login/demo-login + JWT (`apps/api/auth.py`, `routers/auth.py` / standalone equivalents); bcrypt hashing.
- Agents CRUD, interview, generate, chat SSE, evaluate, marketplace/explore — present in `standalone.py` / routers.
- Tool allowlist: `engines/tools/registry.py` + `runtime_registry.py`; tier gate `engines/security/tier_gate.py`; rate limit `engines/security/rate_limit.py`.
- **Gaps vs OM–05:** Redis queue + SSE `/agents/{id}/events` job graph not what the public demo runs (generate is request-scoped with progress polling); `/settings/appearance|language` server APIs missing (prefs are client `localStorage`); cost/observability dashboards missing; Postgres/Alembic exist in repo but live path is JSON/in-memory store.

---

## OM–06 · Feature Set — **Partial**

Normal vs Enterprise differentiation and signature features mostly demoable; “title only → nine streamed stages” is not literal.

- Tier paths: `create_tier` at interview start; Enterprise architecture UI (`EnterpriseArchitectureGraph`); server strips Enterprise tools for Normal (`test_defense_priority.py` SEC-02).
- Deterministic eval / report card before heavy use: `AgentReportCard`, composite scoring engines.
- Versioning: history API + `VersionTimeline` (re-gen does not silently destroy prior snapshots in standalone).
- One-input creation is **interview-assisted** (chips + “I'm ready — generate”), not a single title field with zero dialogue.
- Live stage stream is Product Factory / progress polling, not the OM–09 nine-stage SSE theater.

---

## OM–07 · Experience Design — **Partial**

Architect + resilience foundations exist; inference-prefill and deterministic **replay** of a recorded run are incomplete.

- Guided Create interview as a progress state machine (`create/page.tsx` progress %, readiness gate in `_session_can_generate`).
- Named errors / rate-limit / model-quota copy on Create; empty Explore/Yours invite action.
- Defense resilience: `apps/api/seed/demo_reset.py` + `tests/DEFENSE_CHECKLIST.md`; Explore offline `SEED_LISTINGS` (`lib/seed-listings.ts`).
- Offline specialty / chat-offline helpers in standalone — **not** a UI “deterministic replay” of stored pipeline stage events if the network dies mid-generate.
- Interview is still largely authoring answers, not “open already filled from stages 1–5.”

---

## OM–08 · Quality & Operations — **Partial**

API test weight is strong for a capstone; ops/cost/docs runbook and frontend E2E are the Q&A soft spots.

- API pytest suite: defense priority, product factory, knowledge, tools, orchestration, etc. under `apps/api/tests/`.
- Defense checklist + one-liners: `apps/api/tests/DEFENSE_CHECKLIST.md`.
- Architecture / feature docs: `docs/AGENT_ARCHITECTURE.md`, `FEATURE_CATALOG.md`, this matrix + Appendix A audit.
- **Gaps:** no Playwright Create/auth E2E; no generation load test; no product cost dashboard; no dedicated “if X breaks say Y” runbook doc beyond checklist; CI lint/type gates not evidenced as merge-blocking in-repo workflows.
- Capstone-OK: uptime monitors / backup restore drills called Partial/N/A in Appendix A — rehearse the verbal answer.

---

## OM–09 · Title → Agent Pipeline — **Partial**

End-to-end “describe → agent” works; the engine is a **Product Factory / chat-create** pipeline, not the literal nine named stages in the HTML table.

- Stages in code: Product Factory `PHASE_ORDER` (`classify` … `ai_core`) in `engines/product_factory/phases.py` + critique; chat-create with critique pass in `standalone.py`.
- Layer concepts (knowledge / tools / plans / eval) appear in Enterprise UI and engines; tools map to allowlisted registry.
- Progress visible via generate progress polling + report card; publish writes versioned agent records.
- **Not Done:** exact Stage 1–9 naming/SSE events; Stage 7 “Architect opens pre-filled”; Stage 8 auto rubric before publish as a hard gate; Normal collapse exactly as specified.
- Honest defense line: “Same first principles (infer, critique, score, version) — implementation phases are Product Factory, not the slide’s nine labels.”

---

## OM–10 · Defense Readiness & Roadmap — **Partial**

Phase 1 (auth gate) is Done; phases 2–5 are demoable with caveats; demo script is mostly runnable.

- **Phase 1 Done:** OM–03 gate + three-page shell + agent CRUD.
- **Phases 2–3 Partial:** Normal/Enterprise generate live on Vercel; not full nine-stage Enterprise critique theater.
- **Phase 4 Partial:** Appearance/Language strong subset; HIG/a11y incomplete.
- **Phase 5 Partial:** offline seeds + `demo_reset` + Appendix A rehearsal doc exist; deterministic replay + dedicated runbook still thin.
- Demo script: landing → sign-in → Explore seeds → Create → report card → Yours version timeline — **rehearse**; network-drop → replay needs a practiced fallback (seeds / pre-built agent), not a one-click stage replay yet.

---

## Appendix A · Quality Audit Checklist — **Partial**

Full line-by-line audit already filed; use it as the ops sweep, not a green scorecard.

- Source of truth: `docs/APPENDIX_A_AUDIT_2026-07-22.md` — **33 Pass · 33 Partial · 12 Fail · 2 N/A** (80 lines).
- Strengths: HTTPS/CDN/compression, responsive shell, tap targets, sitemap/robots, bcrypt, rate limits, designed 404, empty states.
- High-risk Fails for panel: Next.js `npm audit` highs, no captcha on register, no product analytics, `/about` 404, synthetic seed ratings as social proof, no `error.tsx`, thin support channels.
- Capstone-OK Partials: uptime monitor, backup restore drill, WAF — prepare one-sentence answers.

---

## Appendix B · Stack Summary & Glossary — **Partial**

Declared stack matches repo choices; live demo omits some layers.

- Frontend matches: Next.js, React, TypeScript, Tailwind (`apps/web`).
- Backend matches: FastAPI (`apps/api`); NestJS not used.
- Postgres + Redis + vector store: present in docker-compose / `main.py` / knowledge engines — **live Vercel API is standalone** without that topology.
- Realtime: chat SSE exists; pipeline progress is polling, not full job-graph SSE.
- Testing glossary: API pytest strong; Jest/RTL/Playwright frontend stack **not** shipped as specified.
- Glossary terms (Normal/Enterprise, Architect, layers, deterministic scoring, tool registry) are used consistently in UI/docs/code.

---

## 1 · Defense talking points (one page)

### What to demo (order)

1. **Landing gate (OM–03)** — open https://omnia-wine.vercel.app logged out: brand + one line + Sign up / Log in only. Try `/explore` → bounce to `/`. Say: “Identity precedes capability; one root gate.”
2. **Sign in** — email/password or explicit demo control if you use it; land Explore (or returnTo).
3. **Explore** — seeded agents even if API blips (`SEED_LISTINGS` / offline). Search + open a card.
4. **Create** — pick Normal (or Enterprise if keys healthy); short interview → generate; narrate **progress** + **report card** (deterministic score, not a black box).
5. **Yours** — open agent, show chat/test-drive, **Version timeline**, Appearance/Language in menu.
6. **If LLM/network fails** — switch to a seeded Explore agent + pre-built Yours agent; cite `demo_reset` / DEFENSE_CHECKLIST. Do **not** promise live stage-replay UI yet.

### If asked about gaps (honest, short)

| Challenge | Answer |
|-----------|--------|
| “Where’s Redis / job queue / SSE pipeline?” | Capstone live API is **standalone on Vercel** for reliability; full Postgres+Redis path exists in repo/`docker-compose`. Progress is polled; chat streams via SSE. |
| “Is this the nine-stage OM–09 pipeline?” | Same principles (infer → critique → score → version). Runtime phases are **Product Factory** (+ chat-create critique), not the HTML’s nine labels 1:1. |
| “JWT in localStorage?” | True for demo speed; bcrypt on server; trade-off is XSS session theft — would move to httpOnly cookies post-capstone. |
| “npm audit / Next?” | Known; pinning Next 14 for ship stability. Patch/upgrade is next hardening, not ignored. |
| “Seed stars / fake proof?” | Demo fabrications — label as Demo if pressed; scores that matter are **deterministic eval**, not marketplace stars. |
| “Uptime / backups / analytics?” | Capstone: Vercel hosting + `demo_reset` + QA docs. No Better Stack / PostHog yet — acknowledged Appendix A Partials/Fails. |
| “Auth gate done?” | **Yes.** `77933e4` — `AuthGate`, landing-only, no silent `ensureAuth` demo-login. |

### Confidence closer

“We shipped the thinnest whole loop — gate, three tabs, create, score, version — and we can show where the next eight inches of depth go without pretending they’re done.”

---

## 2 · Ordered next-build list (max 8 · max defense impact)

1. **Deterministic Create replay / one-click “demo generate”** — recorded stage events or fixed offline invent so a dead LLM key cannot kill the Create beat (OM–07 / OM–10 / DEF-01).
2. **`error.tsx` (+ optional `global-error.tsx`)** — designed “something broke” matching `not-found.tsx` (Appendix A Fail → Pass).
3. **Demo script polish on versioning** — ensure re-generate → new version row is one click and narratable on live (OM–01 / OM–10 script).
4. **Label seed marketplace ratings “Demo”** (or hide counts) — removes honesty trap on Explore stars.
5. **`/about` + second support channel** (GitHub Issues or mailto on Help/Privacy) — Appendix A content/trust Fails.
6. **Stage-labeled progress copy** aligned to whatever phases actually run (Factory names or mapped OM–09 labels) so live narration matches UI.
7. **Next.js advisory plan** — upgrade path or documented temporary pin + mitigations (top Appendix A security Fail).
8. **`og:image` + unique `/help` metadata** — unfinished-share / SEO Partial → quick visual credibility.

*(Deliberately not in top 8 for defense day: full Redis job graph, Playwright suite, product analytics, captcha — valuable, lower live-demo ROI.)*

---

## Evidence anchors (quick)

| Claim | Where |
|-------|--------|
| OM–03 Done | `AuthGate.tsx`, `auth-session.ts`, `app/page.tsx`, `api.ts` (`ensureAuth` / `demoLogin`), commit `77933e4` |
| Live web/API | omnia-wine.vercel.app · omnia-api-ten.vercel.app/health |
| Appendix A detail | `docs/APPENDIX_A_AUDIT_2026-07-22.md` |
| Defense automation | `apps/api/tests/test_defense_priority.py`, `DEFENSE_CHECKLIST.md` |
| Spec source | `docs/OMNIA_BUILD_SPECIFICATION.html` |

---

*OMNIA · Spec Compliance Matrix · 2026-07-22 · for capstone defense use*
