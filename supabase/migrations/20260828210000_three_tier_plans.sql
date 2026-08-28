-- Three-tier billing: core (free), engage (text), voice (text + audio + analytics).
-- Legacy single "pro" subscriptions map to voice (full concierge bundle).

alter type public.billing_plan add value if not exists 'engage';

update public.organization_subscriptions
  set plan = 'voice'
  where plan = 'pro';

update public.organization_subscriptions
  set pending_plan = 'voice'
  where pending_plan = 'pro';
