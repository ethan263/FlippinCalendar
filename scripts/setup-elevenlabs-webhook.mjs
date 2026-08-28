#!/usr/bin/env node
/**
 * Register or update the ElevenLabs workspace webhook for post-call transcriptions.
 *
 * Usage:
 *   node --env-file-if-exists=.env.local scripts/setup-elevenlabs-webhook.mjs
 */
const API_BASE = "https://api.elevenlabs.io/v1";

const webhookUrl =
  process.env.ELEVENLABS_WEBHOOK_URL?.trim() ||
  process.env.NEXT_PUBLIC_WEBHOOKS_URL?.trim() ||
  "https://flippincalendar.co.za/api/webhooks/elevenlabs";

const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY is required (sk_... workspace API key).");
  process.exit(1);
}

async function api(path, init = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!response.ok) {
    throw new Error(`ElevenLabs ${init.method ?? "GET"} ${path} failed (${response.status}): ${text}`);
  }
  return json;
}

async function main() {
  console.log(`Target webhook URL: ${webhookUrl}`);

  const existing = await api("/workspace/webhooks");
  const webhooks = existing?.webhooks ?? existing ?? [];
  const match = Array.isArray(webhooks)
    ? webhooks.find((w) => w.settings?.webhook_url === webhookUrl || w.webhook_url === webhookUrl)
    : null;

  if (match?.webhook_id) {
    console.log(`Updating existing webhook ${match.webhook_id}…`);
    const updated = await api(`/workspace/webhooks/${match.webhook_id}`, {
      method: "PATCH",
      body: JSON.stringify({
        is_disabled: false,
        name: "flippinCalendar post-call",
        events: ["post_call_transcription"],
        retry_enabled: true,
      }),
    });
    console.log("Updated:", JSON.stringify(updated, null, 2));
    return;
  }

  console.log("Creating workspace webhook…");
  const created = await api("/workspace/webhooks", {
    method: "POST",
    body: JSON.stringify({
      settings: {
        auth_type: "hmac",
        name: "flippinCalendar post-call",
        webhook_url: webhookUrl,
      },
    }),
  });

  console.log("Created:", JSON.stringify(created, null, 2));
  if (created?.webhook_secret) {
    console.log("\nSet ELEVENLABS_WEBHOOK_SECRET in Vercel Production:");
    console.log(created.webhook_secret);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
