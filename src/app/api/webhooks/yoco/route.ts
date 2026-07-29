import { NextResponse } from "next/server";

import {
  processYocoPaymentFailed,
  processYocoPaymentSucceeded,
} from "@/lib/billing/process-yoco-event";
import { recordYocoBillingEvent } from "@/lib/billing/subscriptions";
import {
  verifyYocoWebhook,
  type YocoPaymentEvent,
} from "@/lib/yoco/verify-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    verifyYocoWebhook(rawBody, {
      webhookId: request.headers.get("webhook-id"),
      webhookTimestamp: request.headers.get("webhook-timestamp"),
      webhookSignature: request.headers.get("webhook-signature"),
    });
  } catch (error) {
    console.error("Yoco webhook verification failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: YocoPaymentEvent;
  try {
    event = JSON.parse(rawBody) as YocoPaymentEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const eventId = event.id ?? request.headers.get("webhook-id") ?? "";
  const eventType = event.type ?? "unknown";

  if (!eventId) {
    return NextResponse.json({ error: "Missing event id." }, { status: 400 });
  }

  const isNew = await recordYocoBillingEvent({
    yocoEventId: eventId,
    eventType,
    payload: event,
  });

  let result: Record<string, unknown> = { duplicate: !isNew };

  try {
    if (eventType === "payment.succeeded") {
      result = { ...result, ...(await processYocoPaymentSucceeded(event)) };
    } else if (eventType === "payment.failed") {
      result = { ...result, ...(await processYocoPaymentFailed(event)) };
    }
  } catch (error) {
    console.error("Yoco webhook processing failed", error);
    if (isNew) {
      return NextResponse.json(
        { error: "Processing failed — will retry." },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Processing failed on duplicate event." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, ...result });
}
