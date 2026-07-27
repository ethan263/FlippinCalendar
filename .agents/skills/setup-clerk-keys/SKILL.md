---
name: setup-clerk-keys
description: Guides users through setting up Clerk API keys for Trimr authentication, organizations, and billing. Use when Clerk auth fails due to missing keys, when the user needs to configure Clerk, or when setting up a new environment. First checks whether NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are already configured and valid, and only runs full setup when needed.
license: MIT
compatibility: Requires internet access to clerk.com and api.clerk.com. Requires the Clerk CLI for billing/JWT config (`clerk link`, `clerk config patch`).
---

# Clerk API Key Setup

Guide the user through obtaining and configuring Clerk keys for this Trimr project.

## Workflow

### Step 0: Check for existing keys first

Before asking the user for keys, check for existing Clerk configuration:

1. Check whether `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` exist in the current environment. If they do, use those values for this initial check.
2. Only if they are not in the environment, check `.env.local` for both variables.
3. Do not print, quote, or repeat key values. If you mention them, redact them.
4. If both keys are found, validate the secret key:
   ```text
   GET https://api.clerk.com/v1/instance
   Header: Authorization: Bearer <existing-secret-key>
   ```
5. **If validation succeeds:**
   - Tell the user Clerk is already configured and working
   - Skip the key setup flow
   - Ask whether they want to replace/rotate the keys; if not, continue to Step 3 (instance setup) if billing/RBAC is not yet applied
6. **If validation fails:**
   - Tell the user the existing secret key appears invalid or expired
   - Continue to Step 1

### Step 1: Request the API keys

Tell the user:

> To set up Clerk, open the API keys page: https://dashboard.clerk.com/last-active?path=api-keys
>
> (Need an account? Create one at https://dashboard.clerk.com/sign-up first)
>
> If you don't have keys yet:
> 1. Create a new Clerk application (or open an existing one)
> 2. Copy the **Publishable key** (`pk_test_...` or `pk_live_...`)
> 3. Copy the **Secret key** (`sk_test_...` or `sk_live_...`)
>
> Do not paste keys into this chat. Instead, copy them into your local `.env.local` file:
>
> ```
> NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
> CLERK_SECRET_KEY=sk_test_your_key
> ```
>
> If `.env.local` already has these lines, replace them.
> Tell me when you've saved them, without sharing the keys.

Then wait for the user to confirm that the keys are saved locally.

### Step 2: Validate and configure keys

After the user says the keys are saved:

1. Re-check both `.env.local` and the current environment for both Clerk variables, but treat `.env.local` as the source of truth for this step.
2. If `.env.local` contains values, validate the secret key even when the current environment has different values.
3. If `.env.local` does not contain both keys:
   - Tell the user `.env.local` does not appear to contain the required Clerk keys.
   - Show the expected lines again.
   - If the current environment does contain keys, note that this step still requires saving them in `.env.local`.
   - Remind them not to paste keys into chat.
4. If keys are found, validate the secret key:
   ```text
   GET https://api.clerk.com/v1/instance
   Header: Authorization: Bearer <local-secret-key>
   ```
5. If validation fails:
   - Tell the user the local secret key appears invalid or expired.
   - Remind them of the API keys page.
   - Ask them to replace the `.env.local` values and tell you when they are saved.
6. If validation succeeds, confirm:
   > Done. Clerk keys are configured and the secret key in `.env.local` works.

### Step 3: Apply Trimr Clerk instance setup

After keys validate, ensure the Clerk instance matches this repo's requirements:

1. **Enable Organizations** in the Clerk Dashboard (Configure → Organizations). This app is B2B; all work happens inside an org.
2. **Activate the Convex integration** (Configure → Integrations → Convex). The JWT template must be named exactly `convex` with audience `convex`, and include:
   ```json
   {
     "org_id": "{{org.id}}",
     "org_slug": "{{org.slug}}",
     "org_role": "{{org.role}}"
   }
   ```
3. **Link and patch Clerk config** from the project root:
   ```bash
   clerk link
   clerk config patch --file clerk.billing.json
   clerk config patch --file clerk.convex.json
   ```
4. **Provision RBAC**:
   ```bash
   pnpm run clerk:rbac
   ```
5. **Set Convex JWT issuer** — copy the Clerk Frontend API URL (e.g. `https://<instance>.clerk.accounts.dev`) into the Convex deployment as `CLERK_JWT_ISSUER_DOMAIN` (Convex Dashboard → Settings → Environment Variables, or `npx convex env set`).

If `clerk link` fails in agent mode because no publishable key is in `.env.local`, run `clerk apps list --json` and link explicitly with `clerk link --app <app_id>`.

## Safety Rules

- Never ask the user to paste API keys, tokens, or secrets into chat.
- Never print or echo key values from environment variables or `.env.local`.
- Prefer `.env.local` or managed secrets over shell history for persistent local configuration.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is exposed to the browser by design. `CLERK_SECRET_KEY` is server-only — never prefix it with `NEXT_PUBLIC_`.
