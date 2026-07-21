# OMNIA — Appendix A Quality Audit (Defense Day)

**Date:** 2026-07-22  
**Spec source:** `docs/OMNIA_BUILD_SPECIFICATION.html` § Appendix A  
**Products checked:**
- Web (Next.js): https://omnia-wine.vercel.app — code `apps/web`
- API (FastAPI standalone): https://omnia-api-ten.vercel.app — code `apps/api`
**Method:** Code scan + live `curl` (headers, routes, robots/sitemap, timing). No invented passes. Capstone ops items called out as Partial / N/A where appropriate.

**Status legend:** Pass · Partial · Fail · N/A

---

## Summary counts

| Status | Count |
|--------|------:|
| Pass | 33 |
| Partial | 33 |
| Fail | 12 |
| N/A | 2 |
| **Total checklist lines** | **80** |

Rough readiness: strong on shipping surface (HTTPS, CDN, sitemap, nav, empty/404 states, bcrypt, rate limits). Weakest for a panel Q&A: product analytics, about/support channels, cookie consent, Next.js vulnerability debt, OG image, and “ops maturity” (uptime / backup restore).

---

## 01 · Performance & Speed

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Pages load quickly on an ordinary connection | **Pass** | Live TTFB ~0.30s `/`, ~0.29s `/explore`, ~0.59s `/create` (curl 2026-07-22). |
| 2 | Images compressed / modern format | **Partial** | UI is mostly SVG/CSS/`icon.tsx`; no systematic `next/image` WebP pipeline. Raster use is sparse (`favicon.ico`, upload blob previews). |
| 3 | Unused CSS/JS stripped before shipping | **Pass** | Next production build + `optimizePackageImports` for `lucide-react` / `framer-motion` in `apps/web/next.config.mjs`. |
| 4 | Below-the-fold media loads on demand | **Partial** | Little marketing media; no `loading="lazy"` / `next/image` priority pattern found. Route `loading.tsx` skeletons exist. |
| 5 | Static assets cached / CDN | **Pass** | Vercel CDN (`x-vercel-cache`); `/_next/static/css/…` → `cache-control: public,max-age=31536000,immutable`. |
| 6 | Text responses compressed in transit | **Pass** | Live HTML: `content-encoding: br` with `Accept-Encoding: br`. `compress: true` in Next config. |
| 7 | Animations run without visible stutter | **Partial** | `framer-motion` + `reduceMotion` / `prefers-reduced-motion` in CSS; no FPS/jank measurement on live. |
| 8 | Nothing render-blocking in critical path | **Partial** | Blocking OpenDyslexic CSS from jsDelivr in `apps/web/src/app/layout.tsx` `<head>`; Google fonts use `display: "swap"` / `preload: false`. |
| 9 | Common queries indexed | **Pass** | SQLAlchemy `index=True` on FKs/emails; Alembic `ix_knowledge_*` in `apps/api/alembic/versions/20260717_knowledge.py`. Live demo is mostly in-memory standalone. |

---

## 02 · Responsiveness & Devices

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Layout holds from phone to large desktop | **Pass** | `AppShell` / `AppMenu` `lg:` rail; page `sm:`/`md:` padding and stacks throughout `apps/web`. |
| 2 | Grids reflow instead of breaking | **Pass** | Tailwind responsive grids (e.g. AppearanceControls `sm:grid-cols-4`, explore layouts). |
| 3 | Viewport set correctly | **Pass** | `export const viewport` + live `<meta name="viewport" content="width=device-width, initial-scale=1"/>`. |
| 4 | Nothing forces horizontal scrolling | **Partial** | `overflow-hidden` shell + `overflow-x-auto` only for intentional chip rows; not verified on a physical phone. |
| 5 | Tap targets sized for a finger | **Pass** | `min-h-tap` / `min-w-tap` = 44px in `tailwind.config.ts`; used widely on CTAs/menu. |
| 6 | Typography scales across breakpoints | **Pass** | `clamp()` display sizes; appearance `--omnia-font-scale`. |
| 7 | Portrait and landscape work | **Partial** | Responsive CSS only; no landscape QA artifact found. |
| 8 | Checked on a real device, not just resized window | **Fail** | Not found — no device QA notes/screenshots in repo; this audit used curl + code only. |

---

## 03 · Functionality & Reliability

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | No dead links / surprise 404s | **Partial** | Core routes 200; `/marketplace`→`/explore`, `/agents`/`/generate` 200. `/about` → **404**. `SiteFooter` unused (dead component). Auth copy cites Terms/Privacy without links. |
| 2 | Forms validate client + server with specific errors | **Pass** | `AuthPage` `required`/`minLength` + labels; API `RegisterIn` `Field(min_length=…)` → 422; login returns `auth.bad_credentials`. |
| 3 | Designed error pages for not-found and “something broke” | **Partial** | Designed `apps/web/src/app/not-found.tsx` (live 404 title “This page isn't on the network”). **No** `error.tsx` / `global-error.tsx`. |
| 4 | Consistent across major browsers | **Partial** | Modern Next/React stack; Speech API has Safari notes in `VoiceInput.tsx`. No Playwright/Jest browser matrix found under `apps/web`. |
| 5 | Console clean on load | **Partial** | Not fully audited in browser; SSR shows `BAILOUT_TO_CLIENT_SIDE_RENDERING` for menu; `console.warn` paths in speech. |
| 6 | Uptime actually monitored | **Fail** | Not found (no Better Stack/UptimeRobot/status page). `FEATURE_CATALOG.md` lists status/uptime as MISSING. Capstone-acceptable to leave as gap. |
| 7 | Backups exist and restore tested once | **Partial** | Standalone JSON persist + `seed/demo_reset.py` + DEFENSE_CHECKLIST DEF-02; **no documented restore drill**. Capstone N/A-leaning Partial. |
| 8 | Slow/failed request degrades gracefully | **Pass** | Discover `SEED_LISTINGS` offline fallback; Yours error copy; Create rate-limit / model-quota messaging in API. |

---

## 04 · Navigation & UX

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Primary navigation obvious and consistent | **Pass** | Shared `AppMenu` primary nav (Discover / Create / Yours + secondary). |
| 2 | Structure shallow — nothing important buried | **Pass** | Top-level routes for core flows; product apps under `/app/[id]`. |
| 3 | Header and footer consistent | **Partial** | Shell/menu consistent; `SiteFooter.tsx` exists but is **never imported** — legal links live in menu only. |
| 4 | Next action never a guessing game | **Pass** | Empty states with Create CTAs; Create interview chips; 404 recovery links. |
| 5 | Support or contact easy to find | **Partial** | `/help` in menu (200). No dedicated contact/email/Discord; privacy points to “course contact” / repo. |
| 6 | Long pages offer a way back to the top | **Fail** | Not found — no back-to-top control. |
| 7 | Important things reachable in a few clicks | **Pass** | Discover ↔ Create ↔ Yours ≤2 clicks from menu. |
| 8 | Interactions behave as users expect | **Pass** | Standard form/submit/nav patterns; redirects for legacy paths. |

---

## 05 · Design & Visual Consistency

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Branding consistent (logo, palette, type) | **Pass** | Theme tokens + `OmniStar` + 10 themes in appearance system. |
| 2 | Layout has breathing room | **Pass** | Generous padding (`py-14`, glass panels); density control. |
| 3 | Type sized, spaced, contrasted for reading | **Partial** | Thoughtful type scale; formal contrast audit not run (muted-on-field risk on some themes). |
| 4 | Visual hierarchy makes important things important | **Pass** | Display headings + alive CTAs. |
| 5 | Shared components behave the same | **Pass** | Shared Composer, StarRating, shells. |
| 6 | Real favicon (not framework default) | **Pass** | Live `/favicon.ico` 200; `apps/web/src/app/favicon.ico` + `icon.tsx`. |
| 7 | Empty and error states designed on purpose | **Pass** | Explore “No exact match yet”; Yours empty CTA; designed 404. |
| 8 | No leftover placeholder / lorem ships | **Pass** | No Lorem Ipsum in UI source; placeholders are field hints only. |

---

## 06 · Accessibility

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Every meaningful image has real alt text | **Partial** | Chart images labeled in `ToolExecutionBlock`; many decorative `alt=""` (`AgentIcon`, upload previews). |
| 2 | Interactive elements reachable by keyboard | **Partial** | Skip link + `:focus-visible`; sidebar resize `tabIndex={0}`. Full keyboard pass of menus/modals not evidenced. |
| 3 | Color contrast meets WCAG AA | **Partial** | Tokenized colors; no axe/Lighthouse contrast report in repo. |
| 4 | Semantic HTML / ARIA for screen readers | **Partial** | `nav aria-label`, `role="tablist"`, `aria-pressed`/`busy`; not a full a11y audit. |
| 5 | Text usable at 200% zoom | **Partial** | Font scale up to 2.5× in appearance; live 200% zoom not verified. |
| 6 | Focus always visible | **Pass** | Global `:focus-visible { outline: 2px solid var(--ring) }` in `globals.css`. |
| 7 | Status never by color alone | **Partial** | Stars + text ratings; lint “Passed / Needs review” text. Some warning dots (OAuth) are color-only. |
| 8 | Every form field has associated label | **Pass** | Auth labels wrap inputs; explore/create use `htmlFor` + `sr-only`. |

---

## 07 · SEO & Discoverability

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Unique title and description per page | **Partial** | Unique for `/`, `/explore`, `/create`, `/yours`, `/privacy`, `/terms`, `/sign-in`. `/help` falls back to default site title/description. |
| 2 | Logical heading structure (one H1) | **Pass** | Pages use a single display `h1` pattern (help, privacy, terms, 404). |
| 3 | Clean readable URLs | **Pass** | `/explore`, `/create`, `/yours`, `/privacy`, `/terms`. |
| 4 | Sitemap and robots.txt present and correct | **Pass** | Live `robots.txt` Allow + Sitemap; `sitemap.xml` lists home/explore/create/yours/privacy/terms. Code: `robots.ts`, `sitemap.ts`. |
| 5 | Related pages link sensibly | **Pass** | Menu + explore DNA/similar; help → create/privacy. |
| 6 | Social share previews set up | **Partial** | `og:title` / `og:description` / `twitter:card=summary_large_image` present; **no `og:image` / `twitter:image`** in live HTML. |
| 7 | Nothing important accidentally blocked | **Pass** | `robots: { index: true, follow: true }`; live `Allow: /`. 404 sets `noindex` (correct). |

---

## 08 · Security & Privacy

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | HTTPS enforced everywhere | **Pass** | HTTP→HTTPS 308; `strict-transport-security` on web + API. |
| 2 | Public forms protected against spam/bots | **Fail** | Register/sign-in have **no** captcha/honeypot/Turnstile. Rate limits only after auth on some routes. |
| 3 | Dependencies current — no known vulnerable packages | **Fail** | `npm audit` on `apps/web`: **high** Next.js advisories on `next@14.2.35` (force-fix → breaking 16.x). |
| 4 | Input sanitized / output escaped against injection | **Pass** | React text escaping; Pydantic bounds; prior QA noted personalize XSS stored as text. |
| 5 | Passwords hashed; sessions handled safely | **Partial** | `bcrypt` in `apps/api/auth.py`. JWT stored in **`localStorage`** (`apps/web/src/lib/api.ts`) — XSS-sensitive, not httpOnly cookie. |
| 6 | Privacy policy and cookie consent where required | **Partial** | `/privacy` 200 with clear capstone disclosure. **No cookie consent UI**; few non-essential cookies beyond localStorage prefs. |
| 7 | Sensitive data encrypted in transit and at rest | **Partial** | Transit: HTTPS. At rest: standalone `.omnia_store.json` is plaintext on disk (gitignored); managed Postgres encryption depends on host (not documented). |
| 8 | Basic abuse protection (rate limit / firewall) | **Partial** | App `SlidingWindowLimiter` / interview+create limits; Vercel edge. No documented WAF/firewall. |
| 9 | Recovery plan when something goes wrong | **Partial** | `demo_reset.py`, `tests/DEFENSE_CHECKLIST.md`, offline seeds. Spec mentions a defense runbook; **no dedicated shipped runbook doc** found beyond checklist/spec. |

---

## 09 · Content Quality

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Copy actually proofread | **Partial** | Generally polished product voice; Auth “Terms and Privacy Policy” not linked; minor inconsistency risk. |
| 2 | Information stays current | **Pass** | Live demo + recent docs (`QA_SWEEP_REPORT_2026-07-21.md`, build spec Rev 1.0). |
| 3 | Voice consistent | **Pass** | Shared i18n keys + product tone across pages. |
| 4 | Content answers what visitors came for | **Pass** | Home/Discover/Create/Help explain agent creation clearly. |
| 5 | Structure scannable (headings, short paragraphs) | **Pass** | Help steps list; privacy/terms short sections. |
| 6 | Testimonials / proof shown are genuine | **Fail** | Seed marketplace ratings (`SEED_LISTINGS` stars) are demo fabrications — not real user testimonials. |
| 7 | Real “about” explains who’s behind it and why | **Fail** | `/about` → **404**; no About page in app. Capstone story lives mostly in docs HTML, not product. |
| 8 | Every image/video earns its place | **Pass** | Functional UI marks/icons; no decorative stock-photo bloat. |

---

## 10 · Trust & Operations

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Terms of service clear and easy to find | **Pass** | Live `/terms` 200; menu Privacy entry; sitemap includes `/terms`. (Footer component unused but Terms reachable.) |
| 2 | Privacy policy explains what’s collected and why | **Pass** | Live `/privacy` explains accounts, interviews, chat, eval signals, secrets-in-env, LLM providers, capstone caveat. |
| 3 | More than one way to reach support | **Fail** | In-app `/help` only. No second channel (email, GitHub Issues link in UI, Discord). |
| 4 | Analytics to see how the product is used | **Fail** | Not found — no Vercel Analytics / Plausible / PostHog / gtag in web app. |
| 5 | Key actions deliberately tracked | **Fail** | No product analytics events. Internal intelligence ledger exists for agent ops — not visitor funnel tracking. |
| 6 | Reviews happen on a schedule | **N/A** | Capstone: ad-hoc QA (`QA_SWEEP_REPORT_2026-07-21.md`) rather than scheduled ops reviews. Acceptable as N/A for defense. |
| 7 | Real channel to flag a problem | **Partial** | Privacy text mentions course contact / repo issue; no in-product “Report a problem” entry point. |

---

## Top 10 gaps (ranked by defense-day risk)

1. **Next.js known vulnerabilities (`npm audit` high)** — Easy panel “are dependencies patched?” fail. (`apps/web` → `next@14.2.35`)
2. **JWT in `localStorage`** — Session theft via XSS story; bcrypt alone doesn’t make sessions “safe.”
3. **No `error.tsx` / runtime error boundary** — Uncaught client errors fall to Next default, not a designed “something broke” page.
4. **No product analytics / action tracking** — Can’t answer “how do you know people use Create vs Discover?”
5. **Synthetic ratings presented as social proof** — Seed stars look like real reviews; honesty risk if challenged.
6. **Missing About + thin support channels** — `/about` 404; help-only support; weak “who built this / how do I reach you?”
7. **Open registration without bot protection** — Spam/abuse story on a public Vercel demo.
8. **Social preview incomplete (no `og:image`)** — `summary_large_image` without image looks unfinished when shared.
9. **Blocking third-party font CSS + no real-device QA evidence** — Performance/a11y/device questions under pressure.
10. **Ops maturity (uptime monitor, backup restore drill, dedicated runbook)** — Expected Partial/N/A for capstone; still a common examiner checklist item — prepare a verbal answer.

---

## Quick wins (&lt; 1 day) vs bigger gaps

### Quick wins
- Add `apps/web/src/app/error.tsx` (+ optional `global-error.tsx`) matching 404 tone.
- Wire Terms/Privacy links on Auth; link GitHub Issues (or mailto) from Help + Privacy.
- Add `/about` (short capstone story) and include in sitemap/menu.
- Add `openGraph.images` / Twitter image asset; fix `/help` unique `metadata`.
- Label seed ratings as “Demo” in UI (or hide counts for seeds).
- Mount or delete unused `SiteFooter`; add back-to-top on long Help if needed.
- Document verbal runbook: “uptime = Vercel dashboard; backup = demo_reset + seed restore; no production SLA.”
- Pin/upgrade Next within supported 14.x security releases if available (avoid blind `--force` to 16 mid-defense).

### Bigger gaps
- Move session tokens to httpOnly Secure cookies (API + web auth rewrite).
- Dependency upgrade program (Next major / advisory remediation + CI `npm audit`).
- Bot protection on register (Turnstile) + tighter unauth rate limits.
- Real analytics (privacy-preserving) + a few key events (sign-in, create start, generate success).
- Formal a11y pass (axe) + one real-device checklist with screenshots.
- If claiming production ops: uptime monitor + one backup restore rehearsal write-up.

---

## Live URL snapshot (2026-07-22)

| Check | Result |
|-------|--------|
| `GET https://omnia-wine.vercel.app/` | 200, br, HSTS, ~0.3s TTFB |
| `GET …/robots.txt` | 200, `Allow: /`, sitemap URL |
| `GET …/sitemap.xml` | 200, 6 URLs |
| `GET …/favicon.ico` | 200 |
| `GET …/privacy`, `/terms`, `/help` | 200 |
| `GET …/about` | **404** |
| `GET …/this-page-should-404-xyz` | 404, custom not-found |
| `GET https://omnia-api-ten.vercel.app/health` | 200 `{"status":"ok","demo_mode":true,"standalone":true}` |
| HTTP→HTTPS | 308 both hosts |

---

*Audit authored for defense rehearsal against Appendix A in `OMNIA_BUILD_SPECIFICATION.html`. Statuses reflect evidence available on this date — not a claim that Partial items are “done enough” without discussion.*
