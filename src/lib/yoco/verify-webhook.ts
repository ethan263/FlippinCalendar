import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify Yoco Checkout API webhooks (Standard Webhooks format).
 * Requires the raw request body string.
 */
export function verifyYocoWebhook(
  rawBody: string,
  headers: {
    webhookId: string | null;
    webhookTimestamp: string | null;
    webhookSignature: string | null;
  },
): void {
  const secret = process.env.YOCO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("YOCO_WEBHOOK_SECRET is not configured.");
  }

  const { webhookId, webhookTimestamp, webhookSignature } = headers;
  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    throw new Error("Missing Yoco webhook signature headers.");
  }

  const timestamp = Number(webhookTimestamp);
  if (!Number.isFinite(timestamp)) {
    throw new Error("Invalid webhook timestamp.");
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (ageSeconds > 180) {
    throw new Error("Webhook timestamp outside tolerance window.");
  }

  const secretBytes = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice("whsec_".length), "base64")
    : Buffer.from(secret, "utf8");

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  const signatures = webhookSignature
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.startsWith("v1,") ? part.slice(3) : part));

  const valid = signatures.some((signature) => {
    try {
      const a = Buffer.from(signature, "base64");
      const b = Buffer.from(expected, "base64");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });

  if (!valid) {
    throw new Error("Invalid Yoco webhook signature.");
  }
}

export type YocoPaymentEvent = {
  type?: string;
  id?: string;
  payload?: {
    id?: string;
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, string>;
    checkoutId?: string;
    mode?: string;
  };
};
