/**
 * Map ElevenLabs post-call webhook payloads to `public.conversations` columns.
 * See: https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks
 */

export type ConversationChannel = "web";
export type ConversationStatus = "active" | "completed" | "failed";

export type ConversationUpsertRow = {
  organization_id: string;
  external_conversation_id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  caller: string | null;
  transcript: string | null;
  summary: string | null;
  duration_seconds: number | null;
  outcome: string | null;
  started_at: string;
  ended_at: string | null;
};

export type MappedConversationEvent =
  | {
      kind: "upsert";
      eventType: string;
      organizationHint: OrganizationHint;
      row: Omit<ConversationUpsertRow, "organization_id">;
    }
  | { kind: "ignore"; eventType: string; reason: string };

export type OrganizationHint = {
  organizationId: string | null;
  siteSlug: string | null;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function unixToIso(seconds: number | null, fallbackMs = Date.now()): string {
  if (seconds === null) return new Date(fallbackMs).toISOString();
  return new Date(seconds * 1000).toISOString();
}

function readDynamicVariables(data: JsonRecord): Record<string, string> {
  const initiation = asRecord(data.conversation_initiation_client_data);
  const vars = asRecord(initiation?.dynamic_variables) ?? {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars)) {
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    } else if (typeof value === "number" || typeof value === "boolean") {
      out[key] = String(value);
    }
  }
  return out;
}

function organizationHintFromVars(
  vars: Record<string, string>,
): OrganizationHint {
  return {
    organizationId:
      vars.organization_id ??
      vars.organizationId ??
      vars.org_id ??
      null,
    siteSlug: vars.site_slug ?? vars.siteSlug ?? null,
  };
}

function formatTranscript(transcript: unknown): string | null {
  if (!Array.isArray(transcript) || transcript.length === 0) return null;
  const lines: string[] = [];
  for (const turn of transcript) {
    const row = asRecord(turn);
    if (!row) continue;
    const role = asString(row.role) ?? "unknown";
    const message = asString(row.message);
    if (!message) continue;
    lines.push(`${role}: ${message}`);
  }
  return lines.length ? lines.join("\n") : null;
}

function mapConversationStatus(status: string | null): ConversationStatus {
  switch ((status ?? "").toLowerCase()) {
    case "done":
    case "completed":
      return "completed";
    case "failed":
    case "error":
      return "failed";
    case "initiated":
    case "in-progress":
    case "processing":
      return "active";
    default:
      return "completed";
  }
}

function mapChannel(vars: Record<string, string>): ConversationChannel {
  const raw = (
    vars.interaction_channel ??
    vars.channel ??
    "web"
  ).toLowerCase();
  // Schema currently only allows web; keep mapping explicit for future channels.
  void raw;
  return "web";
}

function mapCallSuccessful(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "boolean") return value ? "success" : "failure";
  return null;
}

/**
 * Parse a verified ElevenLabs webhook JSON body into a DB-ready conversation
 * upsert (or an ignore decision for audio-only / unknown events).
 */
export function mapElevenLabsConversationEvent(
  event: unknown,
): MappedConversationEvent {
  const root = asRecord(event);
  if (!root) {
    return { kind: "ignore", eventType: "unknown", reason: "Invalid payload." };
  }

  const eventType = asString(root.type) ?? "unknown";
  const data = asRecord(root.data);
  if (!data) {
    return { kind: "ignore", eventType, reason: "Missing data object." };
  }

  if (eventType === "post_call_audio") {
    return {
      kind: "ignore",
      eventType,
      reason: "Audio payloads are not persisted; wait for transcription.",
    };
  }

  const conversationId = asString(data.conversation_id);
  if (!conversationId) {
    return {
      kind: "ignore",
      eventType,
      reason: "Missing conversation_id.",
    };
  }

  const eventTimestamp = asNumber(root.event_timestamp);

  if (eventType === "call_initiation_failure") {
    const failureReason = asString(data.failure_reason) ?? "unknown";
    const startedAt = unixToIso(eventTimestamp);
    return {
      kind: "upsert",
      eventType,
      organizationHint: organizationHintFromVars(readDynamicVariables(data)),
      row: {
        external_conversation_id: conversationId,
        channel: "web",
        status: "failed",
        caller: null,
        transcript: null,
        summary: null,
        duration_seconds: 0,
        outcome: failureReason,
        started_at: startedAt,
        ended_at: startedAt,
      },
    };
  }

  // Primary path: post_call_transcription (and any compatible transcript event)
  if (
    eventType !== "post_call_transcription" &&
    eventType !== "transcript" &&
    eventType !== "unredacted_transcript"
  ) {
    return {
      kind: "ignore",
      eventType,
      reason: "Unhandled event type.",
    };
  }

  const vars = readDynamicVariables(data);
  const metadata = asRecord(data.metadata);
  const analysis = asRecord(data.analysis);
  const startUnix = asNumber(metadata?.start_time_unix_secs) ?? eventTimestamp;
  const durationSeconds = asNumber(metadata?.call_duration_secs);
  const startedAt = unixToIso(startUnix);
  const endedAt =
    startUnix !== null && durationSeconds !== null
      ? unixToIso(startUnix + durationSeconds)
      : unixToIso(eventTimestamp);

  return {
    kind: "upsert",
    eventType,
    organizationHint: organizationHintFromVars(vars),
    row: {
      external_conversation_id: conversationId,
      channel: mapChannel(vars),
      status: mapConversationStatus(asString(data.status)),
      caller: asString(data.user_id),
      transcript: formatTranscript(data.transcript),
      summary: asString(analysis?.transcript_summary),
      duration_seconds: durationSeconds,
      outcome: mapCallSuccessful(analysis?.call_successful),
      started_at: startedAt,
      ended_at: endedAt,
    },
  };
}
