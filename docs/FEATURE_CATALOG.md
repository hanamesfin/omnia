# OMNIA Feature Catalog

Non-padded product feature inventory for scoping Settings, Create, Discover, and adjacent surfaces.

- **Part A** — Full taxonomy (~350 distinct items)
- **Part B** — Deep Settings & Customization (OMNIA Appearance / Language / Account target depth)
- **Part C** — Gap map vs current codebase (`DONE` / `PARTIAL` / `MISSING`)

Last updated: 2026-07-20

---

## Part A — Full taxonomy

### Onboarding & Account

- Social login (Google)
- Magic-link / passwordless auth
- Guest mode
- Biometric login
- MFA
- Progressive onboarding checklist
- Interactive product tour
- Persona / role selection at setup
- Import data from another service
- SSO for teams
- Multi-profile accounts
- Session persistence across devices
- Account merging (guest → registered)

### Navigation & IA

- Command palette (Cmd+K)
- Persistent bottom nav
- Breadcrumbs
- Collapsible sidebar
- Global search
- Recently viewed
- Bookmarks / favorites
- Tab switching
- Infinite scroll + back-to-top
- Keyboard shortcuts panel
- Deep linking
- Swipe gestures
- Pull-to-refresh

### Search & Discovery

- Typeahead / autocomplete
- Fuzzy / typo-tolerant search
- Faceted filters
- Saved searches with alerts
- Voice search
- Visual / image search
- Trending section
- “Because you liked X”
- Related items
- Tag-based browsing
- No-results fallback suggestions

### Personalization

- Personalized feed
- Light / dark / system theme
- Adjustable font size
- Layout density toggle
- Custom dashboards / widgets
- Behavior-based recommendations
- Adaptive UI
- User-defined shortcuts
- Saved views / filters

### Content & Media

- Rich text / markdown editor
- Drag-and-drop upload
- Inline media preview
- Playback speed control
- Captions / subtitles
- Content version history
- Draft autosave
- Link-unfurl embeds
- Syntax highlighting
- Auto table of contents
- Content templates

### Social & Community

- Threaded comments
- Reactions
- Follow / subscribe
- Activity-history profiles
- DMs
- Group spaces
- @mentions
- External sharing
- Leaderboards
- Moderation queue
- Block / mute
- Real-time collaborative editing

### Notifications

- In-app notification center
- Granular push preferences
- Email digests
- Quiet hours
- Badge counts
- Toast alerts
- SMS for critical events
- Notification grouping
- Read / unread tracking

### Settings & Customization

*(See Part B for OMNIA-depth expansion.)*

- Granular privacy controls
- Self-service data export
- Account deletion
- Theming
- Language + regional variants
- Timezone auto-detect with override
- Unit preferences
- Contrast / motion accessibility settings
- API key management
- Connected-apps management
- Device / session management

### Accessibility

- Screen-reader support
- Full keyboard nav
- High-contrast mode
- Reduced-motion setting
- Text scaling
- Alt text
- Color-blind-friendly palettes
- Visible focus states
- Transcripts
- Voice control

### Performance & Reliability

- Skeleton loading states
- Optimistic UI updates
- Offline caching
- Background sync
- Code-split lazy routes
- Graceful error fallbacks
- Retry logic
- Status / uptime page
- Autosave with conflict resolution

### Security & Privacy

- End-to-end encryption where applicable
- Scoped permissions
- Account activity audit log
- Suspicious-login alerts
- GDPR / CCPA controls
- Password strength meter
- WebAuthn support
- Rate limiting / abuse protection

### Payments & Monetization

- Multiple payment methods
- Tiered subscriptions with clear comparison
- No-card free trial
- Usage-based billing with live meter
- Self-service upgrade / downgrade
- Proration handling
- Multi-currency support
- Promo / referral codes

### Gamification

- Progress bars / streaks
- Achievement badges
- Points / rewards
- Daily check-in incentives
- Milestone celebrations
- Challenges / quests

### AI / ML-Powered

- Semantic search
- Smart autocomplete
- Chatbot / assistant
- Content summarization
- Auto-tagging
- Anomaly / fraud detection
- Personalized ranking

### Collaboration

- Real-time co-editing
- Contextual comment threads
- Share links with permission levels
- Rollback-capable version history
- @mention task assignment
- Shared-space activity feed

### Analytics (user-facing)

- Personal usage dashboard
- Exportable reports
- Custom date ranges
- Visual charts
- Goal-progress visualization

### Help & Support

- In-app knowledge base
- Live chat
- Contextual tooltips
- Feature walkthroughs
- Feedback widget
- Community forum

### Admin / Moderation

- Role-based access control
- Bulk user management
- Moderation queue
- Audit trails
- Custom permission groups
- Support impersonation mode

### Mobile-Specific

- Home-screen widgets
- Deep-linked push notifications
- Offline-first architecture
- Haptic feedback
- Camera / QR scanning

### Integrations & Portability

- Public API + docs
- Webhooks
- Plugin marketplace
- Zapier-style automation
- Full data export (JSON / CSV)
- Scheduled backups

### Feedback & Trust

- In-app rating prompts
- NPS surveys
- Public feature-request voting
- Changelog / release notes
- Transparent pricing
- Public roadmap
- Status transparency

### Growth

- Referral programs with tracking
- Social share incentives
- Viral waitlists

### Vertical-specific (Explore agent types)

**E-commerce:** persistent cart, wishlist, one-click / guest checkout, live inventory, product comparison, photo / video reviews, abandoned-cart recovery, live order tracking, self-service returns

**Streaming:** continue-watching row, multi-profile households, offline downloads, skip intro, watch parties, cross-device sync

**Productivity:** Kanban view, recurring tasks, calendar sync, time tracking, subtasks, workflow templates

**Fintech:** real-time balances, spend categorization, budget alerts, instant card lock, multi-account aggregation

**Dev tools / SaaS:** API sandbox, migration-aware changelogs, usage / quota dashboard, staging vs prod environments

**Education:** per-course progress, instant-feedback quizzes, completion certificates, adaptive learning paths

**Marketplace:** seller storefronts, escrow payments, buyer-seller messaging, dispute resolution, two-sided ratings

---

## Part B — Settings & Customization (OMNIA depth)

Target depth for Appearance, Language, Account, Privacy — not a flat checklist, but shippable setting groups.

### B1. Appearance (UI chrome)

| Setting | Options / notes | Priority |
|---|---|---|
| Theme preset | Light, Dark, Frost, Midnight, Aurora, Ember, Ocean, Graphite, Dusk, Citric | P0 |
| System theme follow | Auto-match OS light/dark; optional override | P1 |
| Accent / alive color | Theme-bound today; optional user accent override | P2 |
| Font family | System, Serif, Mono, OpenDyslexic | P0 |
| Font scale | Continuous 0.5×–2.5× (root rem) | P0 |
| Density scale | Continuous compact → airy | P0 |
| Message style | Bubble vs flat transcripts | P0 |
| Sidebar layout | Expanded / collapsed | P0 |
| Sidebar pin | Pinned / auto-hide | P0 |
| Sidebar width | 200–360px when expanded | P0 |
| Reduce motion | Manual + respect `prefers-reduced-motion` | P0 |
| High contrast | Stronger borders / focus rings on top of theme | P1 |
| Color-blind safe accents | Deuteranopia / protanopia-safe accent packs | P2 |
| Icon size | Match density or independent | P2 |
| Card radius | Soft / sharp (product shells inherit) | P2 |
| Sync prefs to account | Today: localStorage only | P1 |

### B2. Language & region

| Setting | Options / notes | Priority |
|---|---|---|
| UI locale | 14 locales incl. RTL Arabic | P0 |
| Voice dictation language | Follow UI or override per mic | P0 |
| Auto-detect spoken language | Input-language prefs + GT probe | P1 |
| Translation provider status | Show Google Translate configured / missing | P0 |
| Regional number / date format | Derived from locale with override | P1 |
| Timezone | Auto-detect + manual override | P1 |
| First day of week | Locale default + override | P2 |
| Units | Metric / imperial (agent product apps) | P2 |
| Agent output language | Prefer UI locale vs “match user message” | P1 |
| RTL force | Debug / accessibility override | P2 |

### B3. Account & sessions

| Setting | Options / notes | Priority |
|---|---|---|
| Profile display name | Editable | P1 |
| Email (read-only + change flow) | OAuth vs password accounts differ | P1 |
| Auth provider badge | email / google | P0 |
| Role display | admin / editor / viewer | P0 |
| Password change | Email accounts only | P1 |
| MFA / WebAuthn | Optional step-up | P2 |
| Active sessions list | Device, last seen, revoke | P1 |
| Logout this device | | P0 |
| Logout all devices | | P1 |
| Linked OAuth accounts | Connect / disconnect | P1 |
| Demo vs real account banner | Avoid silent demo-login confusion | P0 |
| Delete account | Irreversible + confirmation | P1 |
| Export my data | Agents, ratings, chat history JSON | P1 |

### B4. Privacy & data

| Setting | Options / notes | Priority |
|---|---|---|
| Share context across my agents | Per-agent + global default | P0 |
| Discover listing visibility | Private / unlisted / public | P1 |
| Usage analytics opt-in | Intelligence ledger participation | P1 |
| Model training opt-out | Copy + toggle (even if unused) | P1 |
| Download my data | GDPR-style package | P1 |
| Erase chat history | Per agent / all | P1 |
| Erase knowledge vault | Enterprise docs | P1 |
| Cookie / local storage clear | Themes, appearance, locale | P2 |
| Audit log (my account) | Logins, OAuth, deletes | P2 |

### B5. Create & agent defaults

| Setting | Options / notes | Priority |
|---|---|---|
| Default Create tier | Normal / Enterprise (entitlement-gated) | P0 |
| Preferred generation model | Catalog picker | P0 |
| Default tools allow-list | Soft defaults for interview | P1 |
| Auto-open product app after generate | On / off | P1 |
| Autosave interview draft | Resume mid-Create | P0 |
| Voice confirmation before generate | Accessibility | P2 |

### B6. Notifications (settings surface)

| Setting | Options / notes | Priority |
|---|---|---|
| In-app toasts | On / off | P1 |
| Email digests | Off / daily / weekly | P2 |
| Quiet hours | Local timezone | P2 |
| Alert: agent generate complete | | P1 |
| Alert: Marketplace review / rating | | P2 |
| Alert: security (new login) | | P1 |

### B7. Developer / power user

| Setting | Options / notes | Priority |
|---|---|---|
| API keys (personal) | Create / rotate / revoke | P2 |
| Webhook endpoints | Generate / run events | P2 |
| Connected tools | Resend, MCP servers, Translate | P1 |
| Feature flags (beta) | Opt into experimental UX | P2 |
| Debug panel | Model router, latency, tool traces | P1 |

### B8. Unified Settings IA (recommended)

Ship as one hub with sections — not only sidebar orphans:

```
Settings
├── Appearance     (themes + chrome)
├── Language       (UI, voice, region)
├── Account        (profile, sessions, logout)
├── Privacy        (share context, export, delete)
├── Create defaults
├── Notifications
└── Connected tools / Developer
```

Sidebar can keep Appearance + Language shortcuts; Account / Privacy already have pages — fold into hub when ready.

---

## Part C — Gap map vs current OMNIA

Status legend: **DONE** · **PARTIAL** · **MISSING**

Evidence base: `apps/web` routes/components + `apps/api` (standalone + engines).

### Onboarding & Account

| Item | Status | Notes |
|---|---|---|
| Social login (Google + GitHub) | DONE | `AuthPage` grid of 2; OAuth start/callback when credentials set; Apple Sign In stays disabled |
| Email / password auth | DONE | register / login |
| Demo auto-login | DONE | `ensureAuth` / demo-login |
| Guest mode | MISSING | |
| Magic-link / passwordless | MISSING | |
| MFA / biometrics / WebAuthn | MISSING | |
| Onboarding tour / checklist | MISSING | |
| SSO for teams | MISSING | |
| Account merge guest→registered | MISSING | |
| Editable profile | PARTIAL | Account page view-only |
| Session persistence | PARTIAL | JWT in localStorage; not multi-device sync |

### Navigation & IA

| Item | Status | Notes |
|---|---|---|
| Collapsible sidebar | DONE | `AppMenu` / appearance prefs |
| Persistent nav | DONE | Discover / Create / Yours + settings |
| Global search | PARTIAL | Sidebar search → Explore `?q=` |
| Command palette | MISSING | |
| Breadcrumbs | MISSING | |
| Keyboard shortcuts panel | MISSING | |
| Deep linking | PARTIAL | Routes exist; limited share cards |
| Recently viewed / bookmarks | MISSING | |

### Search & Discovery

| Item | Status | Notes |
|---|---|---|
| Discover search + intent filters | DONE | `/explore` |
| Voice search | DONE | `VoiceInput` on Explore |
| Trending section | DONE | Under Featured |
| Related / suggestions | PARTIAL | Detail page suggestions util |
| Faceted filters beyond intents | PARTIAL | Intent chips only |
| Saved searches / alerts | MISSING | |
| Personalized “because you liked” | MISSING | |
| Fuzzy / typo-tolerant search | PARTIAL | Simple token match |

### Personalization

| Item | Status | Notes |
|---|---|---|
| 10 themes | DONE | `lib/themes.ts` |
| Font scale / family / density | DONE | `appearance-prefs.ts` |
| Reduce motion | DONE | |
| Message style + sidebar chrome | DONE | |
| Agent personalize (model, share_context) | DONE | Yours studio |
| System theme follow | MISSING | Explicit themes only |
| Cross-device synced prefs | MISSING | localStorage |
| Custom dashboards | MISSING | |

### Content & Media

| Item | Status | Notes |
|---|---|---|
| Drag-and-drop / file upload | DONE | Create context uploader |
| Voice dictation | DONE | |
| Chat attachments | DONE | Composer |
| Knowledge vault UI | PARTIAL | Page stub; Create/Enterprise has real pipeline |
| Version history for prompts | MISSING | Versions exist in API models; no UI |
| Rich markdown editor product-wide | PARTIAL | Chat / product surfaces vary |

### Social & Community

| Item | Status | Notes |
|---|---|---|
| Publish to Discover | DONE | |
| Star ratings | DONE | |
| Trust badges | DONE | |
| Reviews beyond stars | PARTIAL | API exists; thin UI |
| Comments / follow / DMs | MISSING | |
| External sharing | MISSING | |

### Notifications

| Item | Status | Notes |
|---|---|---|
| Toast alerts | DONE | Page-local |
| Notification center | MISSING | |
| Email / push / quiet hours | MISSING | |

### Settings & Customization (vs Part B)

| Group | Status | Notes |
|---|---|---|
| Appearance P0 set | DONE | Themes + controls in sidebar |
| Language P0 set | DONE | `/language` + i18n |
| Account logout / me | DONE | |
| Unified Settings hub | MISSING | Split across menu items |
| Privacy export / delete | MISSING | Static privacy page only |
| Sessions management | MISSING | |
| API keys / connected apps UI | PARTIAL | Tools wired server-side; no settings UI |
| Timezone / units | MISSING | |
| High-contrast mode | MISSING | Themes help; not dedicated |

### Accessibility

| Item | Status | Notes |
|---|---|---|
| Font scale + OpenDyslexic | DONE | |
| Reduced motion | DONE | |
| Skip links / focus / tap targets | DONE | |
| RTL for Arabic | DONE | |
| Full keyboard shortcut map | MISSING | |
| Screen-reader tour | MISSING | |
| Color-blind palettes | PARTIAL | Theme variety only |

### Performance & Reliability

| Item | Status | Notes |
|---|---|---|
| Loading states / timeouts | DONE | |
| Generate progress polling | DONE | |
| Create rate limiting | DONE | `engines/security/rate_limit.py` |
| Health endpoint | DONE | |
| Offline / PWA | MISSING | |
| Status / uptime page | MISSING | |

### Security & Privacy

| Item | Status | Notes |
|---|---|---|
| JWT + password hashing | DONE | |
| Create-tier server gate | DONE | `tier_gate.py` |
| Agent read ACL (IDOR guard) | DONE | |
| Injection markers | PARTIAL | Chat path logs warning |
| Rate limiting (Create) | DONE | |
| Audit log UI | MISSING | |
| GDPR export / erasure | MISSING | |
| WebAuthn / MFA | MISSING | |

### Payments & Monetization

| Item | Status | Notes |
|---|---|---|
| “Free” store labels | PARTIAL | Cosmetic only |
| Real billing / subscriptions | MISSING | |

### AI / ML-Powered (OMNIA core)

| Item | Status | Notes |
|---|---|---|
| Guided Create interview | DONE | |
| Product Factory generate | DONE | |
| Model router / catalog | DONE | |
| Agent chat + tool orchestration | DONE | |
| Evaluation composite scoring | DONE | Deterministic |
| Advance / evolution | DONE | |
| Knowledge RAG (Enterprise) | PARTIAL | Engines + gates; vault UI incomplete |
| Semantic Discover ranking | PARTIAL | AQS / Wilson / usage |

### Collaboration / Admin / Mobile / Growth

| Area | Status | Summary |
|---|---|---|
| Collaboration | PARTIAL | Org id + RBAC in code; no team UI |
| Admin console | MISSING | |
| PWA / push / widgets | MISSING | Responsive web only |
| Help architecture page | DONE | `/help` |
| Referral / waitlist | MISSING | |
| Public roadmap / status | MISSING | |

### Create / Agents specific

| Item | Status | Notes |
|---|---|---|
| Normal vs Enterprise Create | DONE | |
| Interview + generate + progress | DONE | |
| Yours library + studio | DONE | |
| Product apps (`/app/[id]`) | DONE | |
| Add from Discover | DONE | |
| Local chat history | DONE | |
| Visual builder canvas | MISSING | |
| Scheduled agents | MISSING | |
| Prompt version history UI | MISSING | |

---

## Suggested next builds (from this catalog)

Ordered for product leverage, not padding:

1. **Unified Settings hub** — fold Appearance, Language, Account, Privacy (Part B IA)
2. **Knowledge vault page** — promote Create/Enterprise RAG into a real library UI
3. **Activity feed** — wire intelligence ledger / creates / GETs (replace stub)
4. **Account export + delete** — defense / trust
5. **System theme + high contrast** — Appearance P1
6. **Sessions / logout-all** — Account P1
7. **Cmd+K command palette** — Navigation P1
8. **Notification center (in-app)** — even if email comes later

---

## Related docs

- `docs/MASTER_BUILD_BRIEF.md`
- `docs/ENGINEERING_SPEC_v0.1.md`
- `docs/AGENT_ARCHITECTURE.md`
- `apps/api/tests/DEFENSE_CHECKLIST.md`
