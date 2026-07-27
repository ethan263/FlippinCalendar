-- Trimr initial schema (migrated from Convex)
-- Clerk org scoping uses auth.jwt() ->> 'org_id' from Clerk session tokens.

create extension if not exists "pgcrypto";

create or replace function public.current_clerk_org_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'org_id', '');
$$;

create or replace function public.current_clerk_user_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

create or replace function public.current_clerk_org_role()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'org_role', '');
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null unique,
  name text not null,
  slug text not null unique,
  timezone text not null default 'UTC',
  currency text not null default 'USD',
  locale text not null default 'en-US',
  terminology jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organizations_by_clerk_org on public.organizations (clerk_org_id);
create index organizations_by_slug on public.organizations (slug);

create table public.public_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  site_slug text not null unique,
  draft jsonb not null,
  published jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index public_sites_by_organization on public.public_sites (organization_id);
create index public_sites_by_site_slug on public.public_sites (site_slug);

create table public.offerings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  category text not null default '',
  duration_minutes integer not null,
  buffer_before_minutes integer not null default 0,
  buffer_after_minutes integer not null default 0,
  price_minor integer not null default 0,
  currency text not null,
  capacity integer not null default 1,
  active boolean not null default true,
  bookable_online boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index offerings_by_organization on public.offerings (organization_id);
create index offerings_by_org_active on public.offerings (organization_id, active);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  clerk_user_id text,
  name text not null,
  title text not null default '',
  bio text not null default '',
  email text,
  phone text,
  image_url text,
  offering_ids uuid[] not null default '{}',
  active boolean not null default true,
  accepting_bookings boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index team_members_by_organization on public.team_members (organization_id);
create index team_members_by_org_active on public.team_members (organization_id, active);
create index team_members_by_org_clerk_user on public.team_members (organization_id, clerk_user_id);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  timezone text not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_minute integer not null,
  end_minute integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index availability_rules_by_organization on public.availability_rules (organization_id);
create index availability_rules_by_org_member on public.availability_rules (organization_id, team_member_id);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text,
  email_normalized text,
  phone text,
  phone_normalized text,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_by_organization on public.contacts (organization_id);
create index contacts_by_org_email on public.contacts (organization_id, email_normalized);
create index contacts_by_org_phone on public.contacts (organization_id, phone_normalized);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  public_site_id uuid references public.public_sites (id) on delete set null,
  contact_id uuid not null references public.contacts (id) on delete restrict,
  offering_id uuid not null references public.offerings (id) on delete restrict,
  team_member_id uuid not null references public.team_members (id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reserved_start_at timestamptz not null,
  reserved_end_at timestamptz not null,
  status text not null check (status in ('pending', 'confirmed', 'completed', 'canceled', 'no_show')),
  source text not null check (source in ('dashboard', 'public_site', 'web_agent')),
  notes text,
  confirmation_code text not null,
  idempotency_key text,
  idempotency_fingerprint text,
  offering_snapshot jsonb not null,
  team_member_snapshot jsonb not null,
  customer_snapshot jsonb not null,
  created_by_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_by_organization on public.bookings (organization_id);
create index bookings_by_org_start on public.bookings (organization_id, start_at);
create index bookings_by_org_status_start on public.bookings (organization_id, status, start_at);
create index bookings_by_org_idempotency on public.bookings (organization_id, idempotency_key);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  external_conversation_id text not null,
  channel text not null default 'web' check (channel = 'web'),
  status text not null check (status in ('active', 'completed', 'failed')),
  contact_id uuid references public.contacts (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  caller text,
  transcript text,
  summary text,
  duration_seconds integer,
  outcome text,
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_by_organization on public.conversations (organization_id);
create index conversations_by_org_external on public.conversations (organization_id, external_conversation_id);

create table public.agent_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null default 'elevenlabs' check (provider = 'elevenlabs'),
  web_agent_id text,
  web_enabled boolean not null default false,
  knowledge_base_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default '',
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index knowledge_items_by_organization on public.knowledge_items (organization_id);
create index knowledge_items_by_org_published on public.knowledge_items (organization_id, published);

-- RLS: org-scoped access via Clerk JWT org_id claim
alter table public.organizations enable row level security;
alter table public.public_sites enable row level security;
alter table public.offerings enable row level security;
alter table public.team_members enable row level security;
alter table public.availability_rules enable row level security;
alter table public.contacts enable row level security;
alter table public.bookings enable row level security;
alter table public.conversations enable row level security;
alter table public.agent_integrations enable row level security;
alter table public.knowledge_items enable row level security;

create policy "organizations_select_member"
  on public.organizations for select
  to authenticated
  using (clerk_org_id = public.current_clerk_org_id());

create policy "organizations_insert_admin"
  on public.organizations for insert
  to authenticated
  with check (
    clerk_org_id = public.current_clerk_org_id()
    and public.current_clerk_org_role() in ('admin', 'owner')
  );

create policy "organizations_update_admin"
  on public.organizations for update
  to authenticated
  using (
    clerk_org_id = public.current_clerk_org_id()
    and public.current_clerk_org_role() in ('admin', 'owner')
  )
  with check (
    clerk_org_id = public.current_clerk_org_id()
    and public.current_clerk_org_role() in ('admin', 'owner')
  );

-- Helper macro pattern for child tables
create policy "public_sites_org_access"
  on public.public_sites for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  );

create policy "offerings_org_access"
  on public.offerings for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  );

create policy "team_members_org_access"
  on public.team_members for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  );

create policy "availability_rules_org_access"
  on public.availability_rules for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  );

create policy "contacts_org_access"
  on public.contacts for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  );

create policy "bookings_org_access"
  on public.bookings for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  );

create policy "conversations_org_access"
  on public.conversations for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  );

create policy "agent_integrations_org_access"
  on public.agent_integrations for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  );

create policy "knowledge_items_org_access"
  on public.knowledge_items for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
    )
  );

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.public_sites to anon;
