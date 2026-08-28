import "server-only";

import {
  type ConversationUpsertRow,
  type OrganizationHint,
} from "@/lib/elevenlabs/map-conversation-event";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolve the flippinCalendar tenant for a post-call webhook using dynamic
 * variables (`organization_id`) or a public site slug fallback.
 */
export async function resolveConversationOrganizationId(
  hint: OrganizationHint,
): Promise<string | null> {
  const supabase = createAdminClient();

  if (hint.organizationId && UUID_RE.test(hint.organizationId)) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", hint.organizationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) return data.id as string;
  }

  // Older or misconfigured sessions may put the Clerk org id in organization_id.
  if (hint.organizationId?.startsWith("org_")) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("clerk_org_id", hint.organizationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) return data.id as string;
  }

  // Personal workspaces tag sessions with the Clerk user id.
  if (hint.organizationId?.startsWith("user_")) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_clerk_user_id", hint.organizationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) return data.id as string;
  }

  const siteSlug = hint.siteSlug?.trim().toLowerCase();
  if (siteSlug) {
    const { data, error } = await supabase
      .from("public_sites")
      .select("organization_id")
      .eq("site_slug", siteSlug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.organization_id) return data.organization_id as string;
  }

  return null;
}

/**
 * Upsert a conversation row for Operate. Safe to call from the ElevenLabs
 * webhook or a future server-side fallback.
 */
export async function upsertConversationFromWebhook(
  row: ConversationUpsertRow,
): Promise<{ id: string; externalConversationId: string }> {
  const supabase = createAdminClient();
  const payload = {
    ...row,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("conversations")
    .upsert(payload, { onConflict: "external_conversation_id" })
    .select("id, external_conversation_id")
    .single();

  if (error) throw new Error(error.message);
  return {
    id: data.id as string,
    externalConversationId: data.external_conversation_id as string,
  };
}
