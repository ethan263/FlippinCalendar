# Domain glossary

Terms used in architecture reviews and deepening discussions for flippinCalendar.

## Workspace

A tenant boundary for bookings, offerings, team, availability, billing, and public presence. Stored as an `organizations` row. Two modes coexist:

- **Personal workspace** — owned by `owner_clerk_user_id`, auto-bootstrapped on sign-up, no Clerk org required.
- **Organization workspace** — linked via `clerk_org_id`, membership resolved through Clerk.

The dashboard route slug (`/app/{orgSlug}`) identifies the active workspace regardless of mode.

## Entitlement

Feature access derived from subscription plan and status. Core unlocks operations hub and custom public page; Pro adds AI agent features (`web_agent`, `browser_voice`, `advanced_analytics`). Resolved centrally via `resolveEntitlementsFromSubscription()` — the single seam between PayFast billing data and product gates.

## PublicSite

The customer-facing page at `/p/{siteSlug}` with booking flow and agent launcher. Gated by publish state, integration config, and entitlements (402 when AI features require Pro). Distinct from the dashboard "Public Site" editor screen.

## AgentSession

A rate-limited conversational session (text, voice, or widget) against a PublicSite. Consumption and release use atomic Postgres RPCs (`consume_agent_session_rate_limit`, `release_agent_session_rate_limit`) to enforce per-window quotas without race conditions.
