# Clerk ↔ Supabase integration — flippinCalendar

Native [third-party auth](https://supabase.com/docs/guides/auth/third-party/clerk) (not the deprecated JWT-template flow). Clerk session tokens are forwarded to Supabase; Postgres RLS reads org claims via `auth.jwt()`.

## Production domain

| System | Value |
|--------|--------|
| Clerk FAPI (JWKS) | `https://clerk.flippincalendar.co.za` |
| Clerk Accounts | `https://accounts.flippincalendar.co.za` |
| Supabase project | `labvbngxfkzeepyyyjov` |

JWKS endpoint (Supabase validates tokens here):

`https://clerk.flippincalendar.co.za/.well-known/jwks.json`

## One-time setup

### 1. Clerk — activate Supabase integration

1. Open [Clerk → Connect with Supabase](https://dashboard.clerk.com/setup/supabase).
2. Select the **Production** instance.
3. Click **Activate Supabase integration**.

This adds `"role": "authenticated"` to every session token (required by Supabase).

### 2. Supabase — register Clerk as third-party auth

1. Open [Supabase → Auth → Third-party](https://supabase.com/dashboard/project/labvbngxfkzeepyyyjov/auth/third-party).
2. **Add provider → Clerk**.
3. Clerk domain: **`clerk.flippincalendar.co.za`**

### 3. Sync `config.toml` to the remote project

```bash
supabase login
supabase config push --project-ref labvbngxfkzeepyyyjov
```

Local file: `supabase/config.toml` → `[auth.third_party.clerk]`.

For local dev with `pk_test_…`, temporarily set `domain` to your `*.clerk.accounts.dev` host, or set `NEXT_PUBLIC_CLERK_FAPI_HOST`.

## App wiring (already in repo)

| Layer | File | Behavior |
|-------|------|----------|
| Server Supabase + Clerk token | `src/lib/supabase/server.ts` | `accessToken: () => auth().getToken()` |
| Browser Supabase + Clerk token | `src/hooks/use-supabase-client.ts` | `useSupabaseClient()` hook |
| Dashboard data (current) | `src/lib/data/auth.ts` | Clerk verify → service-role client + `clerk_org_id` filter |
| RLS helpers | `supabase/migrations/*clerk*` | `current_clerk_org_id()`, JWT v1 + v2 org claims |

The dashboard intentionally uses the **service-role client after Clerk verification** so workspace sync works even before every session token carries `role: authenticated`. Once the integration above is active, client-side RLS queries and direct user-JWT reads work too.

## Required env (Vercel Production)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://labvbngxfkzeepyyyjov.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=…
SUPABASE_SECRET_KEY=…

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_…
CLERK_SECRET_KEY=sk_live_…
NEXT_PUBLIC_APP_URL=https://flippincalendar.co.za
CLERK_AUTHORIZED_PARTIES=https://flippincalendar.co.za,https://www.flippincalendar.co.za
```

Optional override:

```bash
NEXT_PUBLIC_CLERK_FAPI_HOST=clerk.flippincalendar.co.za
```

## Verify

```bash
node --env-file-if-exists=.env.local scripts/verify-clerk-supabase.mjs
node --env-file-if-exists=.env.local scripts/verify-clerk-supabase.mjs --domain clerk.flippincalendar.co.za
```

Expected: all env vars present, JWKS HTTP 200, Supabase REST reachable.

## RLS claims used in this project

Clerk session tokens should include (via org membership):

- `role`: `authenticated`
- `sub`: Clerk user id
- `org_id` / `o.id`, `org_slug` / `o.slg`, `org_role` / `o.rol`

See `public.current_clerk_org_id()` in migrations for v1 + v2 compatibility.

## References

- [Supabase: Clerk third-party auth](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Clerk: Integrate Supabase](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- Cutover checklist: [`docs/cutover-dns-oauth.md`](cutover-dns-oauth.md)
