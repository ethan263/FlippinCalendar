-- Personal workspaces: one Supabase organization row per Clerk user without
-- requiring Clerk Organizations (Clerk Pro). Existing org-based rows unchanged.

alter table public.organizations
  add column if not exists owner_clerk_user_id text;

create unique index if not exists organizations_by_owner_user
  on public.organizations (owner_clerk_user_id)
  where owner_clerk_user_id is not null;

alter table public.organizations
  alter column clerk_org_id drop not null;

-- RLS: allow personal workspace owners in addition to Clerk org members.
drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member"
  on public.organizations for select
  to authenticated
  using (
    clerk_org_id = public.current_clerk_org_id()
    or owner_clerk_user_id = public.current_clerk_user_id()
  );

drop policy if exists "organizations_insert_admin" on public.organizations;
create policy "organizations_insert_admin"
  on public.organizations for insert
  to authenticated
  with check (
    (
      clerk_org_id = public.current_clerk_org_id()
      and public.current_clerk_org_role() in ('admin', 'owner')
    )
    or owner_clerk_user_id = public.current_clerk_user_id()
  );

drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin"
  on public.organizations for update
  to authenticated
  using (
    (
      clerk_org_id = public.current_clerk_org_id()
      and public.current_clerk_org_role() in ('admin', 'owner')
    )
    or owner_clerk_user_id = public.current_clerk_user_id()
  )
  with check (
    (
      clerk_org_id = public.current_clerk_org_id()
      and public.current_clerk_org_role() in ('admin', 'owner')
    )
    or owner_clerk_user_id = public.current_clerk_user_id()
  );

-- Child tables: resolve org via clerk org claim OR personal owner.
drop policy if exists "public_sites_org_access" on public.public_sites;
create policy "public_sites_org_access"
  on public.public_sites for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  );

drop policy if exists "offerings_org_access" on public.offerings;
create policy "offerings_org_access"
  on public.offerings for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  );

drop policy if exists "team_members_org_access" on public.team_members;
create policy "team_members_org_access"
  on public.team_members for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  );

drop policy if exists "availability_rules_org_access" on public.availability_rules;
create policy "availability_rules_org_access"
  on public.availability_rules for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  );

drop policy if exists "contacts_org_access" on public.contacts;
create policy "contacts_org_access"
  on public.contacts for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  );

drop policy if exists "bookings_org_access" on public.bookings;
create policy "bookings_org_access"
  on public.bookings for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  );

drop policy if exists "conversations_org_access" on public.conversations;
create policy "conversations_org_access"
  on public.conversations for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  );

drop policy if exists "agent_integrations_org_access" on public.agent_integrations;
create policy "agent_integrations_org_access"
  on public.agent_integrations for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  );

drop policy if exists "knowledge_items_org_access" on public.knowledge_items;
create policy "knowledge_items_org_access"
  on public.knowledge_items for all
  to authenticated
  using (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_org_id = public.current_clerk_org_id()
         or owner_clerk_user_id = public.current_clerk_user_id()
    )
  );
