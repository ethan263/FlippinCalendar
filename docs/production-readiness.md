# Production readiness — flippincalendar.co.za

**Status:** PARTIAL cutover — Herpies Production build READY; Clerk Production instance created with domain `flippincalendar.co.za` + Organizations enabled. DNS / Vercel live keys / Google OAuth / Billing Stripe still outstanding.  
**Live app URL today:** Vercel Production from `Herpies` (`*.vercel.app`). Canonical target: `https://flippincalendar.co.za`.  
**Cutover DNS + OAuth checklist:** [`docs/cutover-dns-oauth.md`](cutover-dns-oauth.md)  
**Edge (target):** Cloudflare DNS / WAF / CDN in front of **Vercel** Next.js hosting.

## Senior brief (canonical)

> Prepare **flippinCalendar** for production on apex **`flippincalendar.co.za`**, with **Cloudflare** as the authoritative DNS and edge layer in front of the existing **Vercel** Next.js deployment. Encode canonical origins in app config (`NEXT_PUBLIC_APP_URL`, Clerk `authorizedParties`, `metadataBase`). Harden security headers, robots, and sitemap. Document Cloudflare DNS records and a go-live checklist. **Do not** change registrar nameservers, enable live orange-cloud traffic, or switch Clerk/Vercel to Production traffic until cutover is explicitly approved.

## Architecture (target)

| Layer | System |
|-------|--------|
| Domain / DNS / WAF | Cloudflare — `flippincalendar.co.za` |
| App | Next.js 16 on Vercel |
| Auth / billing | Clerk (Production instance at cutover) |
| Data | Supabase |
| Voice / chat | ElevenLabs Concierge |

## Done in repo (prep)

- [x] Canonical helpers in `src/lib/site.ts` (`flippincalendar.co.za` + `www`)
- [x] `metadataBase` / Open Graph / Twitter metadata
- [x] Clerk authorized parties via `getClerkAuthorizedParties()`
- [x] Security headers in `next.config.ts`
- [x] `robots.ts` + `sitemap.ts`
- [x] `.env.example` production domain comments
- [x] `cloudflare/dns-records.example.json` + `cloudflare/README.md`
- [x] This checklist

## Not done (requires your dashboards / approval)

- [ ] Cloudflare: onboard zone `flippincalendar.co.za` (see `cloudflare/README.md`) — **do not** swap NS yet
- [ ] Vercel: add domain; optionally rename project from legacy `trimr`
- [ ] Clerk **Production** instance; allow `https://flippincalendar.co.za` + `https://www.flippincalendar.co.za`
- [ ] Vercel Production env: `NEXT_PUBLIC_APP_URL`, live Clerk keys, Supabase, ElevenLabs
- [ ] ElevenLabs webhook → `https://flippincalendar.co.za/api/webhooks/elevenlabs`
- [ ] ElevenLabs agent auth allowlist: add apex + www (keep empty until cutover if previews must keep working)
- [ ] Apply DNS from `cloudflare/dns-records.example.json`
- [ ] Cutover: registrar → Cloudflare NS → SSL Full (strict) → smoke tests

## Cutover smoke tests

1. Apex + `www` resolve and redirect/canonical as intended  
2. Sign-up / org create / `/app/[slug]`  
3. Publish `/p/[siteSlug]` + Orb (Pro/Voice only)  
4. Clerk billing checkout  
5. ElevenLabs post-call webhook delivers  

## Explicit non-goals for this prep

- No live DNS/nameserver change  
- No Clerk Production traffic  
- No deleting Development instance  
- No Cloudflare Workers migration of the Next app (unless later decided)
