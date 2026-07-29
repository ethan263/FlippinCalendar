-- Yoco-backed org subscriptions (Clerk is auth-only).

create type public.billing_plan as enum ('core', 'pro', 'voice');

create type public.subscription_status as enum (
  'active',
  'pending',
  'past_due',
  'cancelled'
);

create table public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  plan public.billing_plan not null default 'core',
  status public.subscription_status not null default 'active',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  yoco_checkout_id text,
  yoco_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organization_subscriptions_by_org
  on public.organization_subscriptions (organization_id);

create index organization_subscriptions_by_status
  on public.organization_subscriptions (status, current_period_end);

create table public.yoco_billing_events (
  id uuid primary key default gen_random_uuid(),
  yoco_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

alter table public.organization_subscriptions enable row level security;
alter table public.yoco_billing_events enable row level security;

-- Dashboard reads/writes go through service role after Clerk verification.

grant select, insert, update on public.organization_subscriptions to authenticated;
grant select on public.yoco_billing_events to authenticated;
