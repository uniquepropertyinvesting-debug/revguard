# RevGuard Deployment Guide

This is the single source of truth for taking RevGuard from "code complete" to "live and trusted." Every step is required for a production launch. Follow in order.

---

## 1. Required external accounts (one-time, ~30 min)

| Service | Purpose | Plan | Link |
|---|---|---|---|
| Domain registrar | `revguard.io` (or your choice) | Any | Namecheap, Cloudflare Registrar |
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
| `ENCRYPTION_KEY` | yes | 32+ random bytes. `openssl rand -hex 32` |
| `OPENAI_API_KEY` | optional | Required only for AI assistant |
| `SENTRY_DSN` | recommended | Activates error monitoring |
| `LOG_WEBHOOK_URL` | optional | Generic JSON webhook (Logtail, etc.) |
| `RELEASE_VERSION` | optional | e.g. `1.0.0`. Tags Sentry events. |
| `NEXT_PUBLIC_APP_URL` | yes | `https://revguard.io` (your domain) |

---

## 3. DNS records (the part that gates email deliverability)

After buying your domain, add these records at your registrar. Without them dunning emails land in spam.

### 3a. Resend (sender authentication)

1. Resend dashboard → Domains → Add `revguard.io`.
2. Resend gives you 3 records. Add them at your registrar:
   - `TXT @` → SPF record provided by Resend
   - `CNAME` → DKIM record (`resend._domainkey`)
   - `TXT _dmarc` → `v=DMARC1; p=quarantine; rua=mailto:postmaster@revguard.io`
3. Wait for verification (5–30 min). Resend marks the domain green when ready.

### 3b. App domain → Vercel

- `A @` → Vercel's IP (Vercel will provide on domain add)
- `CNAME www` → `cname.vercel-dns.com`

---

## 4. Supabase configuration

- Settings → Database → enable **Point-in-Time Recovery** (Pro plan)
- Authentication → URL Configuration → set Site URL to your domain
- Authentication → Email Templates → confirm "magic link" template is **disabled**; we use password auth only
- Authentication → Providers → ensure **Confirm email** is OFF (per project policy)

---

## 5. Stripe (your customers' Stripe accounts)

Customers connect their own Stripe accounts via the in-app onboarding. They paste:
- Stripe secret key (`sk_live_...`)
- Stripe webhook signing secret (`whsec_...`)

Webhook endpoint they configure in their Stripe dashboard:
```
https://revguard.io/api/webhooks/stripe
```

Events to subscribe to:
- `invoice.payment_failed`
- `invoice.payment_succeeded`
- `customer.subscription.deleted`
- `customer.subscription.updated`
- `charge.refunded`

---

## 6. Pre-launch verification checklist

Run through these before pointing customers at the app:

- [ ] `https://revguard.io/api/health` returns `{"status":"healthy"}`
- [ ] `https://revguard.io/status` shows all green dots
- [ ] Sentry dashboard receives a test event (trigger from `/api/errors` or visit the broken-route test)
- [ ] BetterStack monitor pings `/api/health` every 60s and alerts on 503
- [ ] Sign up a new account → onboarding completes → dashboard loads
- [ ] Connect Stripe test mode → trigger `invoice.payment_failed` webhook → see alert appear
- [ ] Trigger dunning sweep manually → email lands in inbox (not spam)
- [ ] Click "delete my account" in test account → all data gone, auth user removed
- [ ] Run `npm run build` locally — no errors
- [ ] CI green on `main` branch
- [ ] `https://revguard.io` has TLS, A+ on https://observatory.mozilla.org
- [ ] CSP active (no console errors in browser dev tools)
- [ ] Cookie banner appears on first visit
- [ ] Privacy + terms pages reviewed by legal counsel

---

## 7. Operational runbook

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

## 8. Going live

1. Push to `main` → Vercel auto-deploys
2. Smoke test with the checklist above
3. Flip your DNS A record to point to Vercel (you can stage on `staging.revguard.io` first)
4. Announce launch only after 24h of clean Sentry + uptime data

**You're production-ready when every box in section 6 is ticked.**
