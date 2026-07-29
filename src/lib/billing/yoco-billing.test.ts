import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { buildCheckoutIdempotencyKey } from "@/lib/billing/yoco-metadata";
import { readYocoPaymentMetadata } from "@/lib/billing/yoco-metadata";
import { verifyYocoWebhook } from "@/lib/yoco/verify-webhook";

function signWebhookBody(
  rawBody: string,
  secret: string,
  webhookId = "msg_test_1",
  timestamp = String(Math.floor(Date.now() / 1000)),
) {
  const secretBytes = Buffer.from(secret.slice("whsec_".length), "base64");
  const signedContent = `${webhookId}.${timestamp}.${rawBody}`;
  const signature = createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");
  return {
    webhookId,
    webhookTimestamp: timestamp,
    webhookSignature: `v1,${signature}`,
  };
}

describe("Yoco billing helpers", () => {
  it("builds stable checkout idempotency keys per org/plan/hour", () => {
    const keyA = buildCheckoutIdempotencyKey("org-1", "pro");
    const keyB = buildCheckoutIdempotencyKey("org-1", "pro");
    const keyC = buildCheckoutIdempotencyKey("org-1", "voice");

    expect(keyA).toBe(keyB);
    expect(keyC).not.toBe(keyA);
    expect(keyA).toContain("org-1");
  });

  it("reads payment metadata from webhook payload", () => {
    expect(
      readYocoPaymentMetadata({
        organizationId: "org-uuid",
        plan: "pro",
      }),
    ).toEqual({
      organizationId: "org-uuid",
      plan: "pro",
    });
  });

  it("verifies Yoco webhook signatures", () => {
    const secret = "whsec_" + Buffer.from("test-secret").toString("base64");
    process.env.YOCO_WEBHOOK_SECRET = secret;

    const rawBody = JSON.stringify({
      type: "payment.succeeded",
      id: "evt_1",
      payload: { metadata: { organizationId: "org-1", plan: "pro" } },
    });
    const headers = signWebhookBody(rawBody, secret);

    expect(() =>
      verifyYocoWebhook(rawBody, {
        webhookId: headers.webhookId,
        webhookTimestamp: headers.webhookTimestamp,
        webhookSignature: headers.webhookSignature,
      }),
    ).not.toThrow();
  });

  it("rejects invalid webhook signatures", () => {
    const secret = "whsec_" + Buffer.from("test-secret").toString("base64");
    process.env.YOCO_WEBHOOK_SECRET = secret;

    const rawBody = JSON.stringify({ type: "payment.succeeded" });

    expect(() =>
      verifyYocoWebhook(rawBody, {
        webhookId: "msg_bad",
        webhookTimestamp: String(Math.floor(Date.now() / 1000)),
        webhookSignature: "v1,invalid",
      }),
    ).toThrow();
  });
});
