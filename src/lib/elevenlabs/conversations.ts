import "server-only";

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

import { resolveElevenLabsAgentId } from "@/lib/elevenlabs/config";

export type ElevenLabsConversationSnapshot = {
  conversationId: string;
  status: "active" | "completed" | "failed";
  startedAtMs: number;
  endedAtMs?: number;
  durationSeconds?: number;
  summary?: string;
  transcript?: string;
  outcome?: string;
  caller?: string;
  siteSlug?: string;
  organizationIdHint?: string;
  externalUserId?: string;
};

function mapStatus(
  status: string | undefined,
): "active" | "completed" | "failed" {
  if (status === "initiated" || status === "in-progress" || status === "processing") {
    return "active";
  }
  if (status === "failed") return "failed";
  return "completed";
}

function formatTranscript(
  turns: Array<{ role?: string; message?: string | null }>,
): string | undefined {
  const lines = turns
    .map((turn) => {
      const message = turn.message?.trim();
      if (!message) return null;
      const role =
        turn.role === "agent"
          ? "Agent"
          : turn.role === "user"
            ? "Visitor"
            : turn.role ?? "Unknown";
      return `${role}: ${message}`;
    })
    .filter((line): line is string => Boolean(line));
  if (!lines.length) return undefined;
  return lines.join("\n");
}

function readDynamicString(
  variables: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = variables?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function createElevenLabsClient(): ElevenLabsClient | null {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return null;
  return new ElevenLabsClient({ apiKey });
}

export async function fetchElevenLabsConversation(
  conversationId: string,
): Promise<ElevenLabsConversationSnapshot | null> {
  const client = createElevenLabsClient();
  if (!client) return null;

  try {
    const detail = await client.conversationalAi.conversations.get(conversationId);
    const startedAtMs = detail.metadata.startTimeUnixSecs * 1000;
    const durationSeconds = detail.metadata.callDurationSecs || undefined;
    const endedAtMs =
      durationSeconds && durationSeconds > 0
        ? startedAtMs + durationSeconds * 1000
        : undefined;
    const dynamicVariables = detail.conversationInitiationClientData
      ?.dynamicVariables as Record<string, unknown> | undefined;
    const callSuccessful = detail.analysis?.callSuccessful;
    const outcome =
      callSuccessful === "success"
        ? "successful"
        : callSuccessful === "failure"
          ? "unsuccessful"
          : callSuccessful === "unknown"
            ? "unknown"
            : detail.metadata.terminationReason || undefined;

    return {
      conversationId: detail.conversationId,
      status: mapStatus(detail.status),
      startedAtMs,
      endedAtMs,
      durationSeconds,
      summary: detail.analysis?.transcriptSummary?.trim() || undefined,
      transcript: formatTranscript(detail.transcript ?? []),
      outcome,
      caller: detail.userId?.trim() || undefined,
      siteSlug: readDynamicString(dynamicVariables, "site_slug"),
      organizationIdHint: readDynamicString(dynamicVariables, "organization_id"),
      externalUserId: readDynamicString(dynamicVariables, "external_user_id"),
    };
  } catch (error) {
    console.error("Unable to fetch ElevenLabs conversation", {
      conversationId,
      error,
    });
    return null;
  }
}

export async function listRecentElevenLabsConversationIds(args: {
  callStartAfterUnix: number;
  pageSize?: number;
}): Promise<string[]> {
  const client = createElevenLabsClient();
  const agentId = resolveElevenLabsAgentId();
  if (!client || !agentId) return [];

  try {
    const page = await client.conversationalAi.conversations.list({
      agentId,
      callStartAfterUnix: args.callStartAfterUnix,
      pageSize: Math.min(args.pageSize ?? 50, 100),
      summaryMode: "exclude",
    });
    return (page.conversations ?? []).map((row) => row.conversationId);
  } catch (error) {
    console.error("Unable to list ElevenLabs conversations", error);
    return [];
  }
}
