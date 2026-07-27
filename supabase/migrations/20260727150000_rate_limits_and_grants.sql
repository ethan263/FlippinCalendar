-- Rate-limit tables used by public booking and agent session endpoints.

create table if not exists public.public_booking_rate_limits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  public_site_id uuid not null references public.public_sites (id) on delete cascade,
  scope_key text not null,
  window_start bigint not null,
  count integer not null default 0,
  expires_at timestamptz not null
);

create index if not exists public_booking_rate_limits_by_org_site_scope_window
  on public.public_booking_rate_limits (organization_id, public_site_id, scope_key, window_start);
create index if not exists public_booking_rate_limits_by_org_site_expires
  on public.public_booking_rate_limits (organization_id, public_site_id, expires_at);

create table if not exists public.agent_session_rate_limits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  public_site_id uuid not null references public.public_sites (id) on delete cascade,
  scope_key text not null,
  window_start bigint not null,
  count integer not null default 0,
  expires_at timestamptz not null
);

create index if not exists agent_session_rate_limits_by_org_site_scope_window
  on public.agent_session_rate_limits (organization_id, public_site_id, scope_key, window_start);
create index if not exists agent_session_rate_limits_by_org_expires
  on public.agent_session_rate_limits (organization_id, expires_at);

alter table public.public_booking_rate_limits enable row level security;
alter table public.agent_session_rate_limits enable row level security;

-- No policies for authenticated/anon — these tables are service-role only.

grant select, insert, update, delete on public.public_booking_rate_limits to service_role;
grant select, insert, update, delete on public.agent_session_rate_limits to service_role;

-- Explicit Data API grants (tables are no longer auto-exposed).
grant select, insert, update, delete on
  public.organizations,
  public.public_sites,
  public.offerings,
  public.team_members,
  public.availability_rules,
  public.contacts,
  public.bookings,
  public.conversations,
  public.agent_integrations,
  public.knowledge_items
to authenticated;

grant select on public.public_sites to anon;
