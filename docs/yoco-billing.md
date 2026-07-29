# Yoco billing (Clerk auth-only)

Architecture: **Clerk** for sign-in and business (org) RBAC. **Yoco** for hosted checkout. **Supabase** `organization_subscriptions` for plan entitlements.

## Flow

1. User picks Pro or Voice on `/pricing` or `/app/{slug}/billing`.
2. `createYocoCheckoutAction` (or `POST /api/billing/checkout`) creates a Yoco hosted checkout session.
3. User pays on Yoco's hosted page (redirect).
4. Yoco sends `payment.succeeded` to `/api/webhooks/yoco`.
5. Webhook activates the plan in Supabase (`organization_subscriptions`).

## Env vars

```bash
YOCO_CHECKOUT_SECRET_KEY=sk_test_...   # sk_test_* for test cards; sk_live_* for production
YOCO_WEBHOOK_SECRET=whsec_...          # from Yoco webhook registration
NEXT_PUBLIC_APP_URL=https://...        # must be publicly reachable (not localhost) for Yoco redirects
CRON_SECRET=...                        # Vercel Cron auth (Authorization: Bearer)
RESEND_API_KEY=re_...                  # renewal reminder emails (optional)
RESEND_FROM_EMAIL=billing@flippincalendar.co.za
```

## Webhook URL

`https://flippincalendar.co.za/api/webhooks/yoco`

Register via Yoco App → Checkout API → Webhooks, or `POST https://payments.yoco.com/api/webhooks`.

For **local testing**, expose your dev server with ngrok and set `NEXT_PUBLIC_APP_URL` to the ngrok URL. Register the ngrok webhook URL in Yoco test mode.

## Test cards (sk_test_* key)

| Card | Outcome |
|------|---------|
| `4111 1111 1111 1111` | Success |
| `4000 0000 0000 0000` | Success |
| `5555 5555 5555 4444` | Success |
| `4000 0000 0000 0002` | Declined |

Use any future expiry and any 3-digit CVC. Minimum charge is R2.00 (200 cents); Pro/Voice plans exceed this.

## API routes

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/billing/checkout` | Clerk session (org admin) | Start Yoco checkout |
| `POST /api/webhooks/yoco` | HMAC signature | Activate plan on payment |
| `GET /api/cron/billing-renewals` | `CRON_SECRET` bearer | Renewal reminder emails |

Rate limits: 10 checkouts/org/hour, 20 checkouts/user/hour. Checkout idempotency key is stable per org/plan/hour to prevent duplicate sessions from double-clicks.

## Plans (ZAR / month)
| Plan | Amount (cents) | Features |
|------|----------------|----------|
| core | 0 | operations, public page |
| pro | 24900 | + web agent |
| voice | 69900 | + browser audio, analytics |

## Renewals

Yoco has no native subscriptions. Each month, send the business admin a new checkout link before `current_period_end`. Grace period logic uses `past_due` status in `organization_subscriptions`.

A daily Vercel Cron job (`/api/cron/billing-renewals`, 06:00 UTC) emails org admins when `current_period_end` is within 7 days and marks subscriptions `past_due` after the period ends. Set `RESEND_API_KEY` in Vercel for delivery; without it the job still runs but skips sends.

## Clerk

Keep Clerk for sign-in, orgs, and RBAC only. Remove or ignore `clerk.billing.json` on Production — it is no longer used at runtime.
