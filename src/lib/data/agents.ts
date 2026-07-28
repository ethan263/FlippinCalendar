import "server-only";

import type {
  AgentConfiguration,
  Conversation,
  ConversationAnalytics,
} from "@/components/dashboard/data";
import { requireCurrentOrganizationOperator, ms, iso } from "@/lib/data/auth";
import { DAY_MS } from "@/lib/data/time";
import { boundedInteger } from "@/lib/data/shared";
import {
  fetchElevenLabsConversation,
  listRecentElevenLabsConversationIds,
  type ElevenLabsConversationSnapshot,
} from "@/lib/elevenlabs/conversations";
import { createAdminClient } from "@/lib/supabase/admin";

type ConversationRow = {
  id: string;
  organization_id: string;
  external_conversation_id: string;
  channel: "web";
  status: "active" | "completed" | "failed";
  caller: string | null;
  transcript: string | null;
  summary: string | null;
  duration_seconds: number | null;
  outcome: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapConversation(conversation: ConversationRow): Conversation {
  return {
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
  };
}

function isConversationId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{8,128}$/.test(value);
}

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

export type PublicSessionConfig = {
  organizationId: string;
  publicSiteId: string;
  clerkOrgId: string;
  siteSlug: string;
  mode: "text" | "voice" | "widget";
  webAgentId: string | null;
};

/** Resolve publish/integration gates without consuming rate-limit quota. */
export async function requestPublicSession(args: {
  siteSlug: string;
  mode: "text" | "voice" | "widget";
}): Promise<PublicSessionConfig | null> {
  const supabase = createAdminClient();
  const siteSlug = args.siteSlug.trim().toLowerCase();

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

  return {
    organizationId: organization.id as string,
    publicSiteId: site.id as string,
    clerkOrgId: organization.clerk_org_id,
    siteSlug: site.site_slug,
    mode: args.mode,
    webAgentId: (integration.web_agent_id as string | null) ?? null,
  };
}

/** Consume quota only after plan/toggle checks pass and before minting a session. */
export async function consumePublicSessionRateLimit(args: {
  organizationId: string;
  publicSiteId: string;
  clientKey: string;
}): Promise<void> {
  const clientKey = args.clientKey.trim();
  if (!clientKey || clientKey.length > 200) {
    throw new Error(
      "clientKey is required and must be 200 characters or fewer.",
    );
  }

  const supabase = createAdminClient();
  const now = Date.now();
  const minuteWindowStart = Math.floor(now / 60_000) * 60_000;
  const dayWindowStart = Math.floor(now / 86_400_000) * 86_400_000;

  const { data: expired } = await supabase
    .from("agent_session_rate_limits")
    .select("id")
    .eq("organization_id", args.organizationId)
    .lt("expires_at", iso(now))
    .limit(20);
  for (const row of expired ?? []) {
    await supabase.from("agent_session_rate_limits").delete().eq("id", row.id);
  }

  await incrementRateWindow(
    args.organizationId,
    args.publicSiteId,
    "site",
    60,
    minuteWindowStart,
    minuteWindowStart + 2 * 60_000,
  );
  await incrementRateWindow(
    args.organizationId,
    args.publicSiteId,
    `client:${hashClientKey(clientKey)}`,
    8,
    minuteWindowStart,
    minuteWindowStart + 2 * 60_000,
  );
  await incrementRateWindow(
    args.organizationId,
    args.publicSiteId,
    "site:daily",
    500,
    dayWindowStart,
    dayWindowStart + 2 * 86_400_000,
  );
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
  return ((data ?? []) as ConversationRow[]).map(mapConversation);
}

async function upsertConversationRow(args: {
  organizationId: string;
  externalConversationId: string;
  status?: "active" | "completed" | "failed";
  caller?: string | null;
  transcript?: string | null;
  summary?: string | null;
  durationSeconds?: number | null;
  outcome?: string | null;
  startedAt?: number;
  endedAt?: number | null;
  enrich?: boolean;
}): Promise<Conversation> {
  const supabase = createAdminClient();
  const externalConversationId = args.externalConversationId.trim();
  if (!isConversationId(externalConversationId)) {
    throw new Error("A valid conversation id is required.");
  }

  let snapshot: ElevenLabsConversationSnapshot | null = null;
  if (args.enrich !== false) {
    snapshot = await fetchElevenLabsConversation(externalConversationId);
  }

  const now = Date.now();
  const startedAt =
    args.startedAt ??
    snapshot?.startedAtMs ??
    now;
  const status = args.status ?? snapshot?.status ?? "completed";
  const payload = {
    organization_id: args.organizationId,
    external_conversation_id: externalConversationId,
    channel: "web" as const,
    status,
    caller: args.caller ?? snapshot?.caller ?? null,
    transcript: args.transcript ?? snapshot?.transcript ?? null,
    summary: args.summary ?? snapshot?.summary ?? null,
    duration_seconds:
      args.durationSeconds ?? snapshot?.durationSeconds ?? null,
    outcome: args.outcome ?? snapshot?.outcome ?? null,
    started_at: iso(startedAt),
    ended_at:
      args.endedAt === undefined
        ? snapshot?.endedAtMs
          ? iso(snapshot.endedAtMs)
          : status === "completed" || status === "failed"
            ? iso(now)
            : null
        : args.endedAt
          ? iso(args.endedAt)
          : null,
    updated_at: iso(now),
  };

  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("*")
    .eq("organization_id", args.organizationId)
    .eq("external_conversation_id", externalConversationId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const row = existing as ConversationRow;
    const next = {
      status: payload.status,
      caller: payload.caller ?? row.caller,
      transcript: payload.transcript ?? row.transcript,
      summary: payload.summary ?? row.summary,
      duration_seconds: payload.duration_seconds ?? row.duration_seconds,
      outcome: payload.outcome ?? row.outcome,
      started_at: row.started_at,
      ended_at: payload.ended_at ?? row.ended_at,
      updated_at: payload.updated_at,
    };
    const { data, error } = await supabase
      .from("conversations")
      .update(next)
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapConversation(data as ConversationRow);
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapConversation(data as ConversationRow);
}

/** Public post-call hook: store org + ElevenLabs conversation id. */
export async function recordPublicConversation(args: {
  siteSlug: string;
  conversationId: string;
}): Promise<Conversation | null> {
  const supabase = createAdminClient();
  const siteSlug = args.siteSlug.trim().toLowerCase();
  const conversationId = args.conversationId.trim();
  if (!isConversationId(conversationId)) {
    throw new Error("A valid conversation id is required.");
  }

  const { data: site } = await supabase
    .from("public_sites")
    .select("id, organization_id, site_slug, published")
    .eq("site_slug", siteSlug)
    .maybeSingle();
  if (!site?.organization_id) return null;

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, clerk_org_id")
    .eq("id", site.organization_id)
    .maybeSingle();
  if (!organization) return null;

  const snapshot = await fetchElevenLabsConversation(conversationId);
  if (snapshot) {
    const matchesOrg =
      snapshot.organizationIdHint === organization.id ||
      snapshot.externalUserId === organization.clerk_org_id ||
      snapshot.siteSlug?.toLowerCase() === siteSlug;
    // If ElevenLabs returned initiation metadata, require a tenant match.
    if (
      (snapshot.organizationIdHint ||
        snapshot.externalUserId ||
        snapshot.siteSlug) &&
      !matchesOrg
    ) {
      return null;
    }
  }

  return upsertConversationRow({
    organizationId: organization.id,
    externalConversationId: conversationId,
    status: snapshot?.status ?? "completed",
    enrich: false,
    caller: snapshot?.caller,
    transcript: snapshot?.transcript,
    summary: snapshot?.summary,
    durationSeconds: snapshot?.durationSeconds,
    outcome: snapshot?.outcome,
    startedAt: snapshot?.startedAtMs,
    endedAt: snapshot?.endedAtMs ?? Date.now(),
  });
}

/** Dashboard test-session post-call hook. */
export async function recordOperatorConversation(args: {
  conversationId: string;
}): Promise<Conversation> {
  const { organization } = await requireCurrentOrganizationOperator();
  return upsertConversationRow({
    organizationId: organization.id,
    externalConversationId: args.conversationId.trim(),
    status: "completed",
    enrich: true,
  });
}

export async function getConversationAnalytics(): Promise<ConversationAnalytics> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  const now = Date.now();
  const since30 = iso(now - 30 * DAY_MS);
  const since7 = now - 7 * DAY_MS;

  const { data, error } = await supabase
    .from("conversations")
    .select("started_at, duration_seconds, outcome, status")
    .eq("organization_id", organization.id)
    .gte("started_at", since30)
    .limit(500);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  let last7Days = 0;
  let durationTotal = 0;
  let durationCount = 0;
  const outcomes: Record<string, number> = {};

  for (const row of rows) {
    const startedAt = ms(row.started_at) ?? 0;
    if (startedAt >= since7) last7Days += 1;
    if (typeof row.duration_seconds === "number" && row.duration_seconds > 0) {
      durationTotal += row.duration_seconds;
      durationCount += 1;
    }
    const key = (row.outcome as string | null)?.trim() || row.status || "unknown";
    outcomes[key] = (outcomes[key] ?? 0) + 1;
  }

  return {
    last7Days,
    last30Days: rows.length,
    last30DaysIsCapped: rows.length >= 500,
    averageDurationSeconds:
      durationCount > 0 ? Math.round(durationTotal / durationCount) : null,
    outcomes: Object.entries(outcomes)
      .map(([outcome, count]) => ({ outcome, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function getConversationDetail(
  conversationId: string,
): Promise<Conversation | null> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  const id = conversationId.trim();
  if (!id) return null;

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as ConversationRow;
  if (row.transcript && row.summary) {
    return mapConversation(row);
  }

  const enriched = await upsertConversationRow({
    organizationId: organization.id,
    externalConversationId: row.external_conversation_id,
    enrich: true,
  }).catch((error) => {
    console.error("Unable to enrich conversation detail", error);
    return null;
  });
  return enriched ?? mapConversation(row);
}

/**
 * Best-effort backfill: list recent ElevenLabs conversations and keep those
 * tagged with this org's site_slug / organization_id dynamic variables.
 */
export async function syncRecentConversationsFromElevenLabs(): Promise<{
  imported: number;
  scanned: number;
}> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  const { data: site } = await supabase
    .from("public_sites")
    .select("site_slug")
    .eq("organization_id", organization.id)
    .maybeSingle();
  const siteSlug = (site?.site_slug as string | undefined)?.toLowerCase();

  const { data: existing } = await supabase
    .from("conversations")
    .select("external_conversation_id")
    .eq("organization_id", organization.id)
    .limit(500);
  const known = new Set(
    (existing ?? []).map((row) => row.external_conversation_id as string),
  );

  const ids = await listRecentElevenLabsConversationIds({
    callStartAfterUnix: Math.floor((Date.now() - 30 * DAY_MS) / 1000),
    pageSize: 50,
  });

  let imported = 0;
  let scanned = 0;
  for (const conversationId of ids) {
    if (known.has(conversationId)) continue;
    if (scanned >= 15) break;
    scanned += 1;
    const snapshot = await fetchElevenLabsConversation(conversationId);
    if (!snapshot) continue;
    const matches =
      snapshot.organizationIdHint === organization.id ||
      snapshot.externalUserId === organization.clerk_org_id ||
      (siteSlug && snapshot.siteSlug?.toLowerCase() === siteSlug);
    if (!matches) continue;
    await upsertConversationRow({
      organizationId: organization.id,
      externalConversationId: conversationId,
      status: snapshot.status,
      enrich: false,
      caller: snapshot.caller,
      transcript: snapshot.transcript,
      summary: snapshot.summary,
      durationSeconds: snapshot.durationSeconds,
      outcome: snapshot.outcome,
      startedAt: snapshot.startedAtMs,
      endedAt: snapshot.endedAtMs,
    });
    imported += 1;
  }

  // Refresh incomplete local rows (missing summary/transcript).
  const { data: incomplete } = await supabase
    .from("conversations")
    .select("external_conversation_id")
    .eq("organization_id", organization.id)
    .or("summary.is.null,transcript.is.null")
    .order("started_at", { ascending: false })
    .limit(10);
  for (const row of incomplete ?? []) {
    await upsertConversationRow({
      organizationId: organization.id,
      externalConversationId: row.external_conversation_id as string,
      enrich: true,
    });
  }

  return { imported, scanned };
}
