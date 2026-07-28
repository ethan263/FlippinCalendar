import { NextRequest, NextResponse } from "next/server";

import {
  resolveConversationOrganizationId,
  upsertConversationFromWebhook,
} from "@/lib/data/conversations";
import { mapElevenLabsConversationEvent } from "@/lib/elevenlabs/map-conversation-event";
import { verifyElevenLabsWebhookEvent } from "@/lib/elevenlabs/verify-webhook";

export const runtime = "nodejs";

/**
 * ElevenLabs workspace post-call webhook.
 *
 * Register at https://elevenlabs.io/app/agents/settings → Webhooks:
 *   URL: https://<host>/api/webhooks/elevenlabs
 *   Events: transcript (post_call_transcription); optionally call_initiation_failure
 * Store the generated HMAC secret as ELEVENLABS_WEBHOOK_SECRET.
 *
 * Tenant attribution uses session dynamic variables:
 *   organization_id (preferred) or site_slug.
 */
export async function POST(request: NextRequest) {
  if (!process.env.ELEVENLABS_WEBHOOK_SECRET?.trim()) {
    console.error("ElevenLabs webhook rejected: ELEVENLABS_WEBHOOK_SECRET missing");
    return NextResponse.json(
      { error: "Webhook secret is not configured." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature =
    request.headers.get("elevenlabs-signature") ??
    request.headers.get("ElevenLabs-Signature");

  let event: unknown;
  try {
    event = await verifyElevenLabsWebhookEvent(rawBody, signature);
  } catch (error) {
    console.warn("ElevenLabs webhook signature verification failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const mapped = mapElevenLabsConversationEvent(event);
  if (mapped.kind === "ignore") {
    return NextResponse.json(
      { received: true, handled: false, eventType: mapped.eventType, reason: mapped.reason },
      { status: 200 },
    );
  }

  let organizationId: string | null;
  try {
    organizationId = await resolveConversationOrganizationId(
      mapped.organizationHint,
    );
  } catch (error) {
    console.error("ElevenLabs webhook org resolution failed", error);
    return NextResponse.json(
      { error: "Unable to resolve organization." },
      { status: 500 },
    );
  }

  if (!organizationId) {
    console.warn("ElevenLabs webhook skipped: no tenant attribution", {
      eventType: mapped.eventType,
      conversationId: mapped.row.external_conversation_id,
      hint: mapped.organizationHint,
    });
    // Still 200 so ElevenLabs does not disable the webhook for shared-agent
    // sessions that predate organization_id injection.
    return NextResponse.json(
      {
        received: true,
        handled: false,
        eventType: mapped.eventType,
        reason: "Missing organization_id / site_slug dynamic variables.",
      },
      { status: 200 },
    );
  }

  try {
    const saved = await upsertConversationFromWebhook({
      organization_id: organizationId,
      ...mapped.row,
    });
    return NextResponse.json(
      {
        received: true,
        handled: true,
        eventType: mapped.eventType,
        conversationId: saved.id,
        externalConversationId: saved.externalConversationId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("ElevenLabs webhook conversation upsert failed", error);
    return NextResponse.json(
      { error: "Unable to persist conversation." },
      { status: 500 },
    );
  }
}
