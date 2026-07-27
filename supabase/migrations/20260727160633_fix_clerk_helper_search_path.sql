-- Lock search_path on Clerk JWT helper functions (function_search_path_mutable).
-- Empty search_path + schema-qualified auth.jwt() prevents caller-controlled name resolution.

create or replace function public.current_clerk_org_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'org_id', '');
$$;

create or replace function public.current_clerk_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

create or replace function public.current_clerk_org_role()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'org_role', '');
$$;
