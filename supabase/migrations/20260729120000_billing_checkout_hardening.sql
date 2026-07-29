-- Harden Yoco billing: pending plan column, checkout rate limits, service-role-only grants.

alter table public.organization_subscriptions
  add column if not exists pending_plan public.billing_plan;

create table if not exists public.billing_checkout_rate_limits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  scope_key text not null,
  window_start bigint not null,
  count integer not null default 0,
  expires_at timestamptz not null
);

create index if not exists billing_checkout_rate_limits_by_org_scope_window
  on public.billing_checkout_rate_limits (organization_id, scope_key, window_start);

create index if not exists billing_checkout_rate_limits_by_org_expires
  on public.billing_checkout_rate_limits (organization_id, expires_at);

alter table public.billing_checkout_rate_limits enable row level security;

grant select, insert, update, delete on public.billing_checkout_rate_limits to service_role;

-- Billing tables are service-role only (Clerk-verified server actions / webhooks).
revoke all on public.organization_subscriptions from authenticated, anon;
revoke all on public.yoco_billing_events from authenticated, anon;

grant select, insert, update, delete on public.organization_subscriptions to service_role;
grant select, insert, update, delete on public.yoco_billing_events to service_role;
