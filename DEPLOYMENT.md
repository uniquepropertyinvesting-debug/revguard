# RevGuard Deployment Guide

This is the single source of truth for taking RevGuard from "code complete" to "live and trusted." Every step is required for a production launch. Follow in order.

---

## 1. Required external accounts (one-time, ~30 min)

| Service | Purpose | Plan | Link |
|---|---|---|---|
| Domain registrar | `rev-guard.com` | Any | Cloudflare Registrar, Porkbun |
| Vercel | Hosting | Hobby (free) for soft launch | https://vercel.com |
| Supabase | DB + auth (already created) | Pro ($25/mo) for backups | https://supabase.com |
| Resend | Transactional email | Free 3K/mo, then $20/mo | https://resend.com |
| Sentry | Error monitoring | Free tier 5K events/mo | https://sentry.io |
| BetterStack (or UptimeRobot) | Uptime monitoring | Free | https://betterstack.com |
| Stripe | Customer payments (their accounts, not yours) | Free | already integrated |

---

## 2. Environment variables

Set these in your hosting provider (Vercel → Project Settings → Environment Variables). **Never commit them.**

| Var | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | From Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | From Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | From Supabase dashboard. Server-only. |
| `REVGUARD_ENCRYPTION_KEY` | yes | 32-byte hex key for encrypting customer Stripe secrets at rest. Generate with `openssl rand -hex 32`. **Back this up — losing it makes encrypted DB rows unreadable.** |
| `OPENAI_API_KEY` | optional | Required only for AI assistant |
| `SENTRY_DSN` | recommended | Activates error monitoring |
| `LOG_WEBHOOK_URL` | optional | Generic JSON webhook (Logtail, etc.) |
| `RELEASE_VERSION` | optional | e.g. `1.0.0`. Tags Sentry events. |
| `NEXT_PUBLIC_APP_URL` | yes | Your live URL. Use the Vercel-issued URL (e.g. `https://revguard.vercel.app`) until you buy a domain. |

---

## 3. Publishing without a custom domain (interim launch)

You can go live today on Vercel's free subdomain. Steps:

1. Push the repo to GitHub.
2. Vercel → New Project → Import the repo.
3. Vercel auto-detects Next.js. Add the env vars from section 2 in the import screen.
4. Click Deploy. You get `https://<project>.vercel.app` in ~2 minutes.
5. Set `NEXT_PUBLIC_APP_URL` to that exact URL and redeploy once.

**Limits while on a Vercel subdomain (no custom domain):**
- Resend will send email but from `onboarding@resend.dev` until you verify your own domain. Fine for testing, not for customer dunning.
- Stripe webhook URL becomes `https://<project>.vercel.app/api/webhooks/stripe` — this works in Stripe live and test mode.
- Skip section 4 below until you have a domain.

When you buy the domain later, add it in Vercel → Domains, update DNS, and update `NEXT_PUBLIC_APP_URL`. No code changes needed.

---

## 4. DNS records (only when you buy a domain — gates email deliverability)

After buying your domain, add these records at your registrar. Without them dunning emails land in spam.

### 4a. Resend (sender authentication)

1. Resend dashboard → Domains → Add `rev-guard.com`.
2. Resend gives you 3 records. Add them at your registrar:
   - `TXT @` → SPF record provided by Resend
   - `CNAME` → DKIM record (`resend._domainkey`)
   - `TXT _dmarc` → `v=DMARC1; p=quarantine; rua=mailto:postmaster@rev-guard.com`
3. Wait for verification (5–30 min). Resend marks the domain green when ready.

### 4b. App domain → Vercel

- `A @` → Vercel's IP (Vercel will provide on domain add)
- `CNAME www` → `cname.vercel-dns.com`

---

## 5. Supabase configuration

- Settings → Database → enable **Point-in-Time Recovery** (Pro plan, optional until paying customers)
- Authentication → URL Configuration → set Site URL to your live URL (Vercel subdomain or custom domain)
- Authentication → Email Templates → confirm "magic link" template is **disabled**; we use password auth only
- Authentication → Providers → ensure **Confirm email** is OFF (per project policy)
- Database → Tables → confirm RLS is **ON** for all 13 public tables (verified at last build)

---

## 6. Stripe (your customers' Stripe accounts)

Customers connect their own Stripe accounts via the in-app onboarding. They paste:
- Stripe secret key (`sk_live_...`)
- Stripe webhook signing secret (`whsec_...`)

Webhook endpoint they configure in their Stripe dashboard:
```
https://<your-vercel-subdomain-or-domain>/api/webhooks/stripe
```

Events to subscribe to:
- `invoice.payment_failed`
- `invoice.payment_succeeded`
- `customer.subscription.deleted`
- `customer.subscription.updated`
- `charge.refunded`

---

## 7. Pre-launch verification checklist

Run through these before pointing customers at the app:

- [ ] `<your-url>/api/health` returns `{"status":"healthy"}`
- [ ] `<your-url>/status` shows all green dots
- [ ] Sentry dashboard receives a test event (trigger from `/api/errors` or visit the broken-route test)
- [ ] BetterStack monitor pings `/api/health` every 60s and alerts on 503
- [ ] Sign up a new account → onboarding completes → dashboard loads
- [ ] Connect Stripe test mode → trigger `invoice.payment_failed` webhook → see alert appear
- [ ] Trigger dunning sweep manually → email lands in inbox (not spam)
- [ ] Click "delete my account" in test account → all data gone, auth user removed
- [ ] Run `npm run build` locally — no errors
- [ ] CI green on `main` branch
- [ ] Live URL has TLS (Vercel issues automatically), A+ on https://observatory.mozilla.org
- [ ] CSP active (no console errors in browser dev tools)
- [ ] Cookie banner appears on first visit
- [ ] Privacy + terms pages reviewed by legal counsel

---

## 8. Operational runbook

**On-call alerts**
- Sentry: any error event triggers email
- BetterStack: 503 from `/api/health` triggers SMS

**Common incidents**
- DB down → check Supabase status page, fail open is not safe; serve maintenance page
- Stripe webhook signature failures → customer rotated their webhook secret without updating in app
- Email bounce rate >5% → DNS auth broken, recheck SPF/DKIM at https://mxtoolbox.com

**Backups**
- Supabase Pro PITR: 7 days continuous, 30 days daily snapshots
- Manually export weekly via `/api/gdpr/export` for at-risk customers as belt-and-suspenders

**Webhook event retention**
- Cron sweeps `webhook_events` older than 90 days (already in migration `20260429190635`)
- Run via Supabase scheduled function or external cron POSTing to a maintenance endpoint

---

## 9. Going live

1. Push to `main` → Vercel auto-deploys
2. Smoke test with the checklist in section 7
3. (When you have a custom domain) Flip DNS to Vercel; you can stage on a subdomain first
4. Announce launch only after 24h of clean Sentry + uptime data

**You're production-ready when every box in section 7 is ticked.**
