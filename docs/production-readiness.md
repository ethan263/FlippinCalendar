# Production readiness — flippincalendar.co.za

**Status:** LAUNCH PREP — `Herpies` is the production deploy branch. Vercel Production env vars reported set; dashboard cutover (PayFast live test, ElevenLabs webhook, Google OAuth) still required.  
**Canonical URL:** `https://www.flippincalendar.co.za` (apex `flippincalendar.co.za` 308-redirects to www).  
**Cutover DNS + OAuth checklist:** [`docs/cutover-dns-oauth.md`](cutover-dns-oauth.md)  
**Edge (target):** Cloudflare DNS / WAF / CDN in front of **Vercel** Next.js hosting.

## Senior brief (canonical)

> Prepare **flippinCalendar** for production on **`www.flippincalendar.co.za`**, with **Cloudflare** as the authoritative DNS and edge layer in front of the existing **Vercel** Next.js deployment. Encode canonical origins in app config (`NEXT_PUBLIC_APP_URL`, Clerk `authorizedParties`, `metadataBase`). Harden security headers, robots, and sitemap. Document Cloudflare DNS records and a go-live checklist.

## Architecture (target)

| Layer | System |
|-------|--------|
| Domain / DNS / WAF | Cloudflare — `flippincalendar.co.za` |
| App | Next.js 16 on Vercel (`Herpies` branch) |
| Auth | Clerk Production (`pk_live_` / `sk_live_`) |
| Billing | PayFast live (one-time checkout + 30-day period + renewal emails) |
| Data | Supabase |
| Voice / chat | ElevenLabs Concierge |

## Done in repo (prep)

- [x] Canonical helpers in `src/lib/site.ts` (www canonical; apex + www in Clerk parties)
- [x] Apex → www redirect in `next.config.ts`
- [x] `metadataBase` / Open Graph / Twitter metadata
- [x] Clerk authorized parties via `getClerkAuthorizedParties()`
- [x] Security headers in `next.config.ts`
- [x] `robots.ts` + `sitemap.ts` (includes `/privacy`, `/terms`)
- [x] Placeholder `/privacy` and `/terms` pages + marketing footer links
- [x] `.env.example` aligned with actual env var names in code
- [x] GitHub Actions CI (typecheck + test)
- [x] `cloudflare/dns-records.example.json` + `cloudflare/README.md`
- [x] This checklist

## Not done (requires your dashboards / approval)

- [ ] Cloudflare: onboard zone `flippincalendar.co.za` (see `cloudflare/README.md`)
- [ ] Vercel: confirm `Herpies` → Production; domains verified
- [ ] Vercel Production env: `NEXT_PUBLIC_APP_URL=https://www.flippincalendar.co.za`, live Clerk keys, Supabase, PayFast live, ElevenLabs
- [ ] Clerk **Production** Google OAuth client (see `docs/cutover-dns-oauth.md`)
- [ ] PayFast live ITN → `https://www.flippincalendar.co.za/api/webhooks/payfast`
- [ ] PayFast live test payment → `plan=pro` in Supabase
- [ ] ElevenLabs webhook → `https://www.flippincalendar.co.za/api/webhooks/elevenlabs`
- [ ] ElevenLabs agent auth allowlist: apex + www
- [ ] Replace placeholder legal copy on `/privacy` and `/terms`
- [ ] Cutover smoke tests on production domain

## Cutover smoke tests

1. Apex 308 → www; canonical metadata on www  
2. Sign-up / org create / `/app/[slug]`  
3. Publish `/p/[siteSlug]` + AI orb (Pro only)  
4. PayFast billing checkout (live test with owner approval)  
5. ElevenLabs post-call webhook delivers  
6. `/privacy` and `/terms` load from marketing footer

## Env var names (match code)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `SUPABASE_SECRET_KEY` | Supabase service role |
| `ELEVENLABS_DEFAULT_AGENT_ID` | Shared concierge agent |
| `CRON_SECRET` | Vercel Cron auth for renewal job |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Renewal reminder emails |
| `NEXT_PUBLIC_CLERK_FAPI_HOST` | Production Clerk FAPI (optional; auto from `pk_live_`) |

## Explicit non-goals for this prep

- No deleting Clerk Development instance  
- No Cloudflare Workers migration of the Next app (unless later decided)
