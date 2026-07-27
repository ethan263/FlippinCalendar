import "server-only";

import type { AgentConfiguration, Conversation } from "@/components/dashboard/data";
import { requireCurrentOrganizationOperator, ms, iso } from "@/lib/data/auth";
import { boundedInteger } from "@/lib/data/shared";
import { createAdminClient } from "@/lib/supabase/admin";

function hashClientKey(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

async function incrementRateWindow(
  organizationId: string,
  publicSiteId: string,
  scopeKey: string,
  limit: number,
  windowStart: number,
  expiresAt: number,
) {
  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("agent_session_rate_limits")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("public_site_id", publicSiteId)
    .eq("scope_key", scopeKey)
    .eq("window_start", windowStart)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (row && row.count >= limit) {
    throw new Error(
      "Too many concierge sessions. Please wait a moment and try again.",
    );
  }
  if (row) {
    const { error: updateError } = await supabase
      .from("agent_session_rate_limits")
      .update({ count: row.count + 1 })
      .eq("id", row.id);
    if (updateError) throw new Error(updateError.message);
  } else {
    const { error: insertError } = await supabase
      .from("agent_session_rate_limits")
      .insert({
        organization_id: organizationId,
        public_site_id: publicSiteId,
        scope_key: scopeKey,
        window_start: windowStart,
        count: 1,
        expires_at: iso(expiresAt),
      });
    if (insertError) throw new Error(insertError.message);
  }
}

export async function getCurrentAgent(): Promise<AgentConfiguration> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  const { data: integration, error } = await supabase
    .from("agent_integrations")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("provider", "elevenlabs")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    provider: "elevenlabs",
    integration: integration
      ? {
          _id: integration.id,
          webEnabled: integration.web_enabled,
          updatedAt: ms(integration.updated_at)!,
        }
      : null,
  };
}

export async function requestPublicSession(args: {
  siteSlug: string;
  clientKey: string;
  mode: "text" | "voice" | "widget";
}) {
  const supabase = createAdminClient();
  const siteSlug = args.siteSlug.trim().toLowerCase();
  const clientKey = args.clientKey.trim();
  if (!clientKey || clientKey.length > 200) {
    throw new Error(
      "clientKey is required and must be 200 characters or fewer.",
    );
  }

  const { data: site } = await supabase
    .from("public_sites")
    .select("*")
    .eq("site_slug", siteSlug)
    .maybeSingle();
  if (!site?.published || !site.published_at) return null;

  const modeEnabled =
    args.mode === "text"
      ? site.published.agent.showWebChat
      : args.mode === "voice"
        ? site.published.agent.showVoiceChat
        : site.published.agent.showElevenLabsWidget;
  if (!modeEnabled) return null;

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", site.organization_id)
    .maybeSingle();
  if (!organization) return null;

  const { data: integration } = await supabase
    .from("agent_integrations")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("provider", "elevenlabs")
    .maybeSingle();
  if (!integration?.web_enabled) return null;

  const now = Date.now();
  const minuteWindowStart = Math.floor(now / 60_000) * 60_000;
  const dayWindowStart = Math.floor(now / 86_400_000) * 86_400_000;

  const { data: expired } = await supabase
    .from("agent_session_rate_limits")
    .select("id")
    .eq("organization_id", organization.id)
    .lt("expires_at", iso(now))
    .limit(20);
  for (const row of expired ?? []) {
    await supabase.from("agent_session_rate_limits").delete().eq("id", row.id);
  }

  await incrementRateWindow(
    organization.id,
    site.id,
    "site",
    60,
    minuteWindowStart,
    minuteWindowStart + 2 * 60_000,
  );
  await incrementRateWindow(
    organization.id,
    site.id,
    `client:${hashClientKey(clientKey)}`,
    8,
    minuteWindowStart,
    minuteWindowStart + 2 * 60_000,
  );
  await incrementRateWindow(
    organization.id,
    site.id,
    "site:daily",
    500,
    dayWindowStart,
    dayWindowStart + 2 * 86_400_000,
  );

  return {
    clerkOrgId: organization.clerk_org_id,
    siteSlug: site.site_slug,
    mode: args.mode,
  };
}

export async function listRecentConversations(args: {
  limit?: number;
  channel?: "web";
} = {}): Promise<Conversation[]> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  const limit = boundedInteger(args.limit ?? 25, "limit", 1, 100);
  let query = supabase
    .from("conversations")
    .select("*")
    .eq("organization_id", organization.id)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (args.channel) query = query.eq("channel", args.channel);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((conversation) => ({
    _id: conversation.id,
    externalConversationId: conversation.external_conversation_id,
    channel: conversation.channel,
    status: conversation.status,
    caller: conversation.caller ?? undefined,
    transcript: conversation.transcript ?? undefined,
    summary: conversation.summary ?? undefined,
    durationSeconds: conversation.duration_seconds ?? undefined,
    outcome: conversation.outcome ?? undefined,
    startedAt: ms(conversation.started_at)!,
    endedAt: ms(conversation.ended_at),
    createdAt: ms(conversation.created_at),
    updatedAt: ms(conversation.updated_at),
  }));
}
