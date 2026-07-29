import "server-only";

import type { YocoPaymentEvent } from "@/lib/yoco/verify-webhook";
import { readYocoPaymentMetadata } from "@/lib/billing/yoco-metadata";
import {
  abortPendingCheckout,
  activatePaidSubscription,
  getSubscriptionByOrganizationId,
} from "@/lib/billing/subscriptions";

export { readYocoPaymentMetadata };

export async function processYocoPaymentSucceeded(
  event: YocoPaymentEvent,
): Promise<{ activated: boolean; reason?: string }> {
  const { organizationId, plan } = readYocoPaymentMetadata(event.payload?.metadata);
  if (!organizationId || !plan || plan === "core") {
    return { activated: false, reason: "missing_metadata" };
  }

  const paymentId = event.payload?.id ?? null;
  const existing = await getSubscriptionByOrganizationId(organizationId);
  if (
    existing?.status === "active" &&
    existing.plan === plan &&
    paymentId &&
    existing.yocoPaymentId === paymentId
  ) {
    return { activated: false, reason: "already_activated" };
  }

  await activatePaidSubscription({
    organizationId,
    plan,
    yocoCheckoutId: event.payload?.checkoutId ?? null,
    yocoPaymentId: paymentId,
  });

  return { activated: true };
}

export async function processYocoPaymentFailed(
  event: YocoPaymentEvent,
): Promise<{ aborted: boolean; reason?: string }> {
  const { organizationId } = readYocoPaymentMetadata(event.payload?.metadata);
  if (!organizationId) {
    return { aborted: false, reason: "missing_metadata" };
  }

  const existing = await getSubscriptionByOrganizationId(organizationId);
  if (existing?.status !== "pending") {
    return { aborted: false, reason: "not_pending" };
  }

  await abortPendingCheckout(organizationId);
  return { aborted: true };
}
