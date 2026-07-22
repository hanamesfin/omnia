# Upstash Redis — durable auth for Vercel

OMNIA's API is a Vercel serverless function. Without shared storage, accounts
created on one instance vanish on another (causing "invalid sign-in" and, before
the 2026-07 fix, a silent fallback to `admin@demo.com`).

Upstash Redis (REST) is the durable user store. Email register/login and OAuth
upsert now write to Upstash when configured.

## Setup (≈2 minutes)

1. Go to [console.upstash.com](https://console.upstash.com) → **Redis** → **Create Database**
   - Region: pick one close to your Vercel region (e.g. `us-east-1`)
   - Type: Regional is fine on the free tier
2. Open the database → **REST API** tab
3. Copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. In Vercel → **omnia-api** project → **Settings → Environment Variables**, add both for Production (and Preview if you want)
5. **Redeploy** omnia-api

Vercel KV names also work if you prefer that product:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

## Verify

After redeploy:

1. Sign up with a real email (not demo)
2. Log out
3. Sign back in with the same credentials → must succeed and show *your* name/email on `/account`
4. Opening an agent must keep you signed in as yourself

Without these env vars the API still runs (local in-memory), but returning-user
email login remains best-effort across cold instances.
