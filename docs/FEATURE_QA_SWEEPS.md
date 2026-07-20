# OMNIA — Feature QA Sweep Prompts

Two versions: a **full sweep** (before major milestones / defense prep) and a **quick smoke test** (after any meaningful change). Paste into Cursor with the repo open.

## How to use these well

- Run with the dev server up if the tool has browser/terminal access — “trace the code” alone produces confident false positives.
- Run phases separately on a large codebase — one giant shot makes later phases shallow.
- After failures, paste the bug list back (“fix bug #3, then re-run Phase 2”) rather than fix-and-re-verify in one pass.
- Update the “Expected feature set” list in the full prompt as you build.

---

## Full Sweep Prompt

```
You are performing a full QA sweep of the OMNIA platform (AI Agent Creation
Ecosystem — Next.js/React/TypeScript/Tailwind frontend, FastAPI/NestJS
backend, PostgreSQL + Redis + vector DB). Your job is to verify that every
feature actually works as specified — not just that it renders without
crashing.

Work through these phases in order. Complete each phase fully before moving
to the next, and produce a structured report after each phase
(table: Feature | Status [Pass/Fail/Partial/Not Found] | Notes).

Do not mark anything "Pass" without actually tracing or executing the
relevant code path. If you cannot verify something (no way to run the app,
no test data, etc.), say so explicitly rather than assuming it works.

---

PHASE 0 — Feature inventory

Scan the codebase (routes, pages, API endpoints, DB models) and produce a
complete list of implemented features. Cross-check it against the expected
feature set below. Flag anything expected but missing, and anything present
but not in this list.

Expected feature set:
- Explore page: browse public agents
- Create page: guided interview flow, including an "Architect" step
  (verify it does NOT repeat the same question regardless of the user's
  reply — this was a known past bug)
- Yours page: personal library of created + added agents
- Tier system: Normal vs Enterprise, with Enterprise unlocking the
  seven-layer build (knowledge, memory, tools, plans, eval)
- Appearance settings (~10 settings, including font size and theme choice)
- Language settings (~15 settings, including language customization)
- Authentication / account flows
- Agent generation logic (rule-based scoring, LLM-orchestration — confirm
  there is no hidden dependency on an external dataset)
- Cursor AI integration (status + prompt + cursor_agent tool)
- Wave-1/2: lifecycle events, DNA/remix, Guide agent, report card,
  version timeline, drift nudges, post-mortem

---

PHASE 1 — Functional walkthrough

For every feature found in Phase 0, exercise it end-to-end and confirm:
it does what it's supposed to, empty/error states are handled, loading
states appear correctly, and the UI matches the underlying data (no stale
cache, no state left over from a previous action).

---

PHASE 2 — Edge cases and known-hard scenarios

Check each of these explicitly — give every one its own pass/fail, don't
summarize them as a group:
- Guided interview: abandon mid-step, return later — does state persist
  correctly, or does it reset?
- Tier boundary: attempt to access an Enterprise-only feature from a
  Normal-tier account by calling the API directly, not just clicking
  through the UI
- Rapid double-submit on the Create flow — does it create duplicate agents?
- Empty, max-length, and non-English input in every free-text field
- Delete an agent that's open in a second tab/session — does the second
  tab fail gracefully or throw an unhandled error?
- Explore search/filter that returns zero results — is there a real empty
  state, or a blank screen?

---

PHASE 3 — Security spot-check

- Confirm tier/permission checks are enforced server-side, not only hidden
  in the UI
- Attempt to access another account's private agent by manipulating an ID
  in the request
- Check for injection risk in any free-text field that reaches the
  database or vector search
- Confirm the Create/generation endpoint has rate limiting

---

PHASE 4 — Non-functional

- Confirm the demo-reset script actually returns the app to a clean, known
  state (not just the primary DB — check Redis and the vector DB too)
- Confirm the app functions with no network access (offline independence)
- Flag any obviously slow queries or N+1 patterns on pages that list agents

---

FINAL OUTPUT

Produce one markdown report containing:
1. Feature inventory table (Phase 0)
2. Pass/Fail table for Phases 1-4, one row per check
3. A prioritized bug list (Critical / High / Medium / Low)
4. A short "defense-day risk" section — anything here that could visibly
   break in front of evaluators, ranked by how likely it is to come up
```

---

## Quick Smoke Test Prompt

```
Do a quick smoke test of OMNIA after this change. Don't do a full audit —
just confirm the core paths still work:

1. Explore page loads and displays agents
2. Create flow: complete the guided interview end-to-end for one Normal
   agent and one Enterprise agent, confirm both generate successfully
3. The Architect step responds correctly to different answers (does not
   repeat the same question)
4. Yours page shows both agents just created
5. Tier gating still holds: a Normal-tier account cannot reach
   Enterprise-only features via direct API call
6. No new console errors or unhandled exceptions during any of the above

Report only failures, with the specific step and error. If everything
passes, just say so — don't pad the response.
```
