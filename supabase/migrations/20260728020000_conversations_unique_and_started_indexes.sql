-- Support upserts by org + ElevenLabs conversation id, and analytics by started_at.
create unique index if not exists conversations_org_external_unique
  on public.conversations (organization_id, external_conversation_id);

create index if not exists conversations_by_org_started
  on public.conversations (organization_id, started_at desc);
