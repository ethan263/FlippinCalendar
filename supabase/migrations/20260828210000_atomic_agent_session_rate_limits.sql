-- Atomic consume/release for public agent session rate limits.
-- Prevents race-condition bypass and supports rollback when ElevenLabs mint fails.

create unique index if not exists agent_session_rate_limits_unique_window
  on public.agent_session_rate_limits (
    organization_id,
    public_site_id,
    scope_key,
    window_start
  );

create or replace function public.consume_agent_session_rate_limit(
  p_organization_id uuid,
  p_public_site_id uuid,
  p_scope_key text,
  p_limit integer,
  p_window_start bigint,
  p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.agent_session_rate_limits (
    organization_id,
    public_site_id,
    scope_key,
    window_start,
    count,
    expires_at
  )
  values (
    p_organization_id,
    p_public_site_id,
    p_scope_key,
    p_window_start,
    1,
    p_expires_at
  )
  on conflict (organization_id, public_site_id, scope_key, window_start)
  do update
    set count = agent_session_rate_limits.count + 1
    where agent_session_rate_limits.count < p_limit
  returning count into v_count;

  if v_count is null or v_count > p_limit then
    raise exception
      'Too many concierge sessions. Please wait a moment and try again.';
  end if;
end;
$$;

create or replace function public.release_agent_session_rate_limit(
  p_organization_id uuid,
  p_public_site_id uuid,
  p_scope_key text,
  p_window_start bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.agent_session_rate_limits
  set count = greatest(count - 1, 0)
  where organization_id = p_organization_id
    and public_site_id = p_public_site_id
    and scope_key = p_scope_key
    and window_start = p_window_start
    and count > 0;
end;
$$;

revoke all on function public.consume_agent_session_rate_limit(
  uuid, uuid, text, integer, bigint, timestamptz
) from public;
revoke all on function public.release_agent_session_rate_limit(
  uuid, uuid, text, bigint
) from public;

grant execute on function public.consume_agent_session_rate_limit(
  uuid, uuid, text, integer, bigint, timestamptz
) to service_role;
grant execute on function public.release_agent_session_rate_limit(
  uuid, uuid, text, bigint
) to service_role;
