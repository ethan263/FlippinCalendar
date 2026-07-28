import "server-only";

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/**
 * Verify an ElevenLabs workspace webhook using HMAC (`ElevenLabs-Signature`).
 * Requires the raw request body string — do not re-serialize JSON first.
 */
export async function verifyElevenLabsWebhookEvent(
  rawBody: string,
  signatureHeader: string | null,
): Promise<unknown> {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("ELEVENLABS_WEBHOOK_SECRET is not configured.");
  }
  if (!signatureHeader?.trim()) {
    throw new Error("Missing ElevenLabs-Signature header.");
  }

  const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY?.trim() || "webhook-verify-only",
  });

  return elevenlabs.webhooks.constructEvent(
    rawBody,
    signatureHeader,
    secret,
  );
}
