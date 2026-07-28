-- ElevenLabs conversation ids are globally unique; enforce uniqueness so
-- post-call webhooks can upsert reliably for Operate.
create unique index if not exists conversations_external_conversation_id_key
  on public.conversations (external_conversation_id);
