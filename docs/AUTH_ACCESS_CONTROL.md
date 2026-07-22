# Auth access control (OM–03)

Client gate: `apps/web/src/components/AuthGate.tsx` + `apps/web/src/lib/auth-session.ts`.

| Area | Behavior |
|------|----------|
| Public routes | `/`, `/sign-in`, `/sign-up`, `/auth/callback`, `/privacy`, `/terms` |
| Protected | Everything else (Explore, Create, Yours, Account, Help, integrations, …) |
| Unauthenticated | Soft spinner → `/sign-in?returnTo=…` (no protected UI flash) |
| Logout | Full clear + `location.replace("/sign-in")`; multi-tab via `storage` / `BroadcastChannel` |
| Session expiry | Clear JWT → `/sign-in?reason=session` only on definitive `auth.invalid_token` / `auth.demo_disallowed` with Authorization sent **and** the failed token still matching storage — never on bare 401, `auth.missing`, `auth.session_unavailable`, 403, network, silentAuth, or a demo `/auth/me` response when the JWT itself is a real user |
| Demo admin | Blocked — no `demo-login` bypass |

**Follow-up:** migrate JWT from `localStorage` to httpOnly cookies.
