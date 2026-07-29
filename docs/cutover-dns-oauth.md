# Production DNS + OAuth checklist — flippincalendar.co.za

Apply these **now** so Clerk Production can finish DNS/SSL and Google sign-in works.

## 1. Cloudflare DNS (zone: `flippincalendar.co.za`)

Import or create from `cloudflare/dns-records.example.json`:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| A | `@` | `76.76.21.21` | DNS only |
| CNAME | `www` | `cname.vercel-dns.com` | DNS only |
| CNAME | `clerk` | `frontend-api.clerk.services` | **DNS only** |
| CNAME | `accounts` | `accounts.clerk.services` | **DNS only** |
| CNAME | `clkmail` | `mail.ioxqly7efr5z.clerk.services` | DNS only |
| CNAME | `clk._domainkey` | `dkim1.ioxqly7efr5z.clerk.services` | DNS only |
| CNAME | `clk2._domainkey` | `dkim2.ioxqly7efr5z.clerk.services` | DNS only |

Then: SSL **Full (strict)** · Always HTTPS · point registrar NS to Cloudflare when records are ready.

## 2. Vercel Domains + Production env

Add domains: `flippincalendar.co.za`, `www.flippincalendar.co.za`.

Production env (do **not** put live keys on Preview):

```bash
NEXT_PUBLIC_APP_URL=https://flippincalendar.co.za
CLERK_AUTHORIZED_PARTIES=https://flippincalendar.co.za,https://www.flippincalendar.co.za
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_…   # from clerk env pull --instance prod
CLERK_SECRET_KEY=sk_live_…                    # rotated cutover secret
```

Keep Supabase + ElevenLabs secrets. ElevenLabs webhook:

`https://flippincalendar.co.za/api/webhooks/elevenlabs`

## 2b. Clerk ↔ Supabase (third-party auth)

Production Clerk FAPI: **`clerk.flippincalendar.co.za`**

1. [Clerk → Activate Supabase integration](https://dashboard.clerk.com/setup/supabase) (Production instance)
2. [Supabase → Auth → Third-party → Clerk](https://supabase.com/dashboard/project/labvbngxfkzeepyyyjov/auth/third-party) — domain `clerk.flippincalendar.co.za`
3. `supabase login && supabase config push --project-ref labvbngxfkzeepyyyjov`
4. `node --env-file-if-exists=.env.local scripts/verify-clerk-supabase.mjs`

Full guide: [`docs/clerk-supabase-integration.md`](clerk-supabase-integration.md)

## 3. Google Cloud OAuth (Web client) — **still required**

Clerk Production has `connection_oauth_google` **disabled** (empty client_id/secret). Dev shared credentials do **not** work in Production.

1. Open [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials?project=saas1-503519) (project `saas1-503519`).
2. Configure OAuth consent screen if prompted (External / Testing is fine for soft launch).
3. Create **OAuth client ID** → Application type **Web application** → name `flippinCalendar Clerk Production`.
4. Authorized redirect URIs:
   - `https://clerk.flippincalendar.co.za/v1/oauth_callback`
   - `https://accounts.flippincalendar.co.za/v1/oauth_callback`
5. Authorized JavaScript origins:
   - `https://flippincalendar.co.za`
   - `https://www.flippincalendar.co.za`
   - `https://clerk.flippincalendar.co.za`
   - `https://accounts.flippincalendar.co.za`
6. Paste Client ID + Secret into chat (or set via):

```bash
clerk config patch --instance prod --json "{\"connection_oauth_google\":{\"enabled\":true,\"authenticatable\":true,\"client_id\":\"YOUR_ID.apps.googleusercontent.com\",\"client_secret\":\"YOUR_SECRET\"}}"
```

Or Clerk Dashboard → Production → Social connections → Google.

## 4. Verify

```bash
clerk deploy status
# dns/ssl/mail → ok
# open https://flippincalendar.co.za/sign-in
```

Clerk domains UI: https://dashboard.clerk.com/apps/app_3H4zQPUD48F6Nf1OBfcjiU4lCxg/instances/ins_3H8qnDBcKY6852h5cV9BTnqJFT2/domains
