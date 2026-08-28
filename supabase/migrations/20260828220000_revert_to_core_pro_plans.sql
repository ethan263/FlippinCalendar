-- Revert three-tier billing to core + pro.
-- Pro unlocks all AI features; legacy engage/voice rows map to pro.

update public.organization_subscriptions
  set plan = 'pro'
  where plan in ('engage', 'voice');

update public.organization_subscriptions
  set pending_plan = 'pro'
  where pending_plan in ('engage', 'voice');
