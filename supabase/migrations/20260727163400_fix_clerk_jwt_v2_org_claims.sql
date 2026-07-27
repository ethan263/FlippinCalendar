-- Clerk session tokens (JWT v2) put active org claims under `o`:
--   o.id, o.slg, o.rol (rol has no org: prefix).
-- Legacy v1 tokens use top-level org_id / org_slug / org_role (role includes org:).
-- RLS helpers must accept both shapes and normalize role to match policies
-- that check for 'admin' / 'owner'.

create or replace function public.current_clerk_org_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(
    coalesce(
      auth.jwt() ->> 'org_id',
      auth.jwt() -> 'o' ->> 'id'
    ),
    ''
  );
$$;

create or replace function public.current_clerk_org_role()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(
    regexp_replace(
      coalesce(
        auth.jwt() ->> 'org_role',
        auth.jwt() -> 'o' ->> 'rol',
        ''
      ),
      '^org:',
      ''
    ),
    ''
  );
$$;
