---
name: setup-supabase
description: Guides users through setting up Supabase for Trimr (replacing Convex). Use when Supabase tools fail due to missing keys, when migrating from Convex, or when configuring a new environment. First checks whether Supabase keys are configured and valid, then applies schema and Clerk third-party auth integration.
license: MIT
compatibility: Requires internet access to supabase.com. Requires Supabase MCP authentication in Cursor (.cursor/mcp.json). Uses Clerk session tokens with Supabase third-party auth.
---

# Supabase Setup

Guide the user through configuring Supabase for this Trimr project.

## Workflow

### Step 0: Check MCP and existing keys

1. Confirm `.cursor/mcp.json` includes the Supabase MCP server for project `labvbngxfkzeepyyyjov`.
2. If MCP tools are unavailable, tell the user to authenticate Supabase MCP in Cursor (OAuth flow in browser).
3. Check `.env.local` for:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
4. Do not print or echo key values.
5. If keys exist, validate with a lightweight query via MCP `execute_sql`:
   ```sql
   select current_database();
   ```

### Step 1: Request API keys

Tell the user:

> Open your Supabase API settings: https://supabase.com/dashboard/project/labvbngxfkzeepyyyjov/settings/api
>
> Copy the **Project URL**, **Publishable key**, and **Secret key** into `.env.local`:
>
> ```
> NEXT_PUBLIC_SUPABASE_URL=https://labvbngxfkzeepyyyjov.supabase.co
> NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
> SUPABASE_SECRET_KEY=your_secret_key
> ```
>
> Do not paste keys into chat. Tell me when saved.

### Step 2: Clerk + Supabase integration

1. Visit https://dashboard.clerk.com/setup/supabase and configure Clerk for Supabase.
2. In Supabase Dashboard → Authentication → Third-party auth, add **Clerk** integration.
3. Ensure Clerk session tokens include:
   - `role`: `authenticated`
   - `org_id`, `org_slug`, `org_role` (for multi-tenant RLS)

### Step 3: Apply database schema

Run migrations against the linked project:

```bash
npx supabase link --project-ref labvbngxfkzeepyyyjov
npx supabase db push
```

Or apply `supabase/migrations/20260727140000_initial_schema.sql` via MCP `execute_sql`.

### Step 4: Verify

1. Run MCP `get_advisors` for security/performance issues.
2. Confirm RLS policies exist on all public tables.
3. Test a signed-in Clerk user can read their organization row.

## Safety Rules

- Never ask users to paste secret keys in chat.
- Never expose `SUPABASE_SECRET_KEY` to the browser.
- Enable RLS on every table exposed to the Data API.
