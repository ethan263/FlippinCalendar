alter table public.organization_subscriptions
  add column if not exists renewal_reminder_sent_at timestamptz;

create index if not exists organization_subscriptions_renewal_due
  on public.organization_subscriptions (current_period_end)
  where plan <> 'core' and status in ('active', 'past_due');
