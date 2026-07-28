import "server-only";

/**
 * Keep in sync with `agents.json` (Agents CLI push).
 * Used when env still has the README placeholder.
 */
export const SHARED_CONCIERGE_AGENT_ID =
  "agent_5101kyk31534e7bb4vp8v2x4dae3";

const PLACEHOLDER_AGENT_IDS = new Set([
  "agent_your_shared_concierge",
  "your_shared_concierge",
]);

/**
 * Shared ElevenLabs agent id used for every tenant session.
 * Rejects README placeholders so we fail closed with 503 instead of
 * minting against a non-existent agent.
 */
export function resolveElevenLabsAgentId(
  preferred?: string | null,
): string | null {
  const candidates = [
    preferred?.trim(),
    process.env.ELEVENLABS_DEFAULT_AGENT_ID?.trim(),
    SHARED_CONCIERGE_AGENT_ID,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (PLACEHOLDER_AGENT_IDS.has(candidate)) continue;
    if (!candidate.startsWith("agent_")) continue;
    if (candidate.length > 200) continue;
    return candidate;
  }

  return null;
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(
    process.env.ELEVENLABS_API_KEY?.trim() && resolveElevenLabsAgentId(),
  );
}
