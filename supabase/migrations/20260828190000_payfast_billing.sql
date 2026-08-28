-- Migrate Yoco billing columns to PayFast and add ITN event log.

alter table public.organization_subscriptions
  rename column yoco_checkout_id to payfast_m_payment_id;

alter table public.organization_subscriptions
  rename column yoco_payment_id to payfast_payment_id;

create table if not exists public.payfast_billing_events (
  id uuid primary key default gen_random_uuid(),
  pf_payment_id text not null unique,
  m_payment_id text,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

alter table public.payfast_billing_events enable row level security;

revoke all on public.payfast_billing_events from authenticated, anon;
grant select, insert, update, delete on public.payfast_billing_events to service_role;

-- Legacy voice plan → pro
update public.organization_subscriptions set plan = 'pro' where plan = 'voice';
update public.organization_subscriptions set pending_plan = 'pro' where pending_plan = 'voice';
