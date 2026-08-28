# PayFast billing (Clerk auth-only)

Architecture: **Clerk** for sign-in and business (org) RBAC. **PayFast** for hosted checkout. **Supabase** `organization_subscriptions` for plan entitlements.

## Flow

1. User picks Pro on `/pricing` or `/app/{slug}/billing`.
2. Server checks `organization_subscriptions` in Supabase before starting checkout.
3. `createPayfastCheckoutAction` builds a signed PayFast form (R99/month).
4. Browser POSTs to PayFast sandbox or live process URL.
5. User pays on PayFast hosted page.
6. PayFast sends ITN to `/api/webhooks/payfast`.
7. ITN handler verifies signature, validates with PayFast, activates plan in Supabase.
8. User returns via `return_url`; billing page polls entitlements until `plan=pro`.

## Plans (ZAR / month)

| Plan | Amount | AI concierge |
|------|--------|--------------|
| core | R0 | No |
| pro | R99.00 | Yes |

## Env vars

```bash
PAYFAST_MERCHANT_ID=10053364          # sandbox test merchant
PAYFAST_MERCHANT_KEY=...
PAYFAST_PASSPHRASE=...
PAYFAST_MODE=sandbox                  # sandbox | live
NEXT_PUBLIC_APP_URL=https://...       # must be publicly reachable for ITN/redirects
CRON_SECRET=...
RESEND_API_KEY=...                    # renewal reminders (optional)
```

## Webhook URL

`https://flippincalendar.co.za/api/webhooks/payfast`

Cloudflare proxies the apex domain to Vercel. Run `node scripts/setup-cloudflare-dns.mjs` once to enable orange-cloud proxy.

## API routes

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/billing/checkout` | Clerk session (org admin) | Start PayFast checkout |
| `POST /api/webhooks/payfast` | PayFast ITN signature | Activate plan on payment |
| `GET /api/cron/billing-renewals` | `CRON_SECRET` bearer | Renewal reminder emails |

## Database

- `organization_subscriptions` — plan state (`payfast_m_payment_id`, `payfast_payment_id`)
- `payfast_billing_events` — ITN deduplication on `pf_payment_id`
- `billing_checkout_rate_limits` — checkout throttling

All billing tables are service-role only.
