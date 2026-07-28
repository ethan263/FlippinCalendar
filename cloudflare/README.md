# Cloudflare zone prep — flippincalendar.co.za

Official onboarding reference: [Onboard a domain](https://developers.cloudflare.com/fundamentals/manage-domains/add-site/).

## Target architecture

- **Cloudflare**: authoritative DNS + optional proxy (WAF / CDN / HTTPS)
- **Vercel**: Next.js app host (unchanged for now)
- **Do not** update registrar nameservers until cutover is approved

## Prep now (safe)

1. Create a Cloudflare account (if needed).
2. **Onboard a domain** → enter `flippincalendar.co.za` → choose a plan.
3. Import / review DNS records using `dns-records.example.json` as the template:
   - Apex `A` → `76.76.21.21` (Vercel) — **DNS only** until verified
   - `www` `CNAME` → `cname.vercel-dns.com` — **DNS only** until verified
4. Note the two Cloudflare nameservers shown on Overview — you will paste these at the registrar **only on cutover day**.
5. Plan SSL: **Full (strict)** after Vercel issues the certificate.

## Cutover day (explicit approval required)

1. Add `flippincalendar.co.za` (+ `www`) in Vercel → Domains.
2. Set Vercel Production env (`NEXT_PUBLIC_APP_URL=https://flippincalendar.co.za`, Clerk live keys, etc.).
3. Disable DNSSEC at the registrar (if enabled), then replace nameservers with Cloudflare’s.
4. Wait until zone status is **Active**.
5. Optionally enable orange-cloud proxy; keep MX/TXT for email DNS-only.
6. Re-enable DNSSEC via Cloudflare if desired.
7. Run smoke tests in `docs/production-readiness.md`.

## Explicit non-goals

- No Workers migration of the Next app in this phase
- No orange-cloud on verification CNAMEs until Vercel confirms the domain
- No deleting Clerk Development instance
