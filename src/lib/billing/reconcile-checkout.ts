import "server-only";

import {
  abortPendingCheckout,
  activatePaidSubscription,
  getSubscriptionByOrganizationId,
} from "@/lib/billing/subscriptions";
import { readYocoPaymentMetadata } from "@/lib/billing/yoco-metadata";
import {
  checkoutIndicatesFailure,
  checkoutIndicatesPayment,
} from "@/lib/yoco/checkout-status";
import { getYocoCheckout } from "@/lib/yoco/get-checkout";

export async function reconcilePendingCheckout(
  organizationId: string,
): Promise<{ activated: boolean; reason?: string }> {
  const subscription = await getSubscriptionByOrganizationId(organizationId);
  if (!subscription) {
    return { activated: false, reason: "no_subscription" };
  }

  if (subscription.status !== "pending" || !subscription.pendingPlan) {
    return { activated: false, reason: "not_pending" };
  }

  const checkoutId = subscription.yocoCheckoutId;
  if (!checkoutId) {
    return { activated: false, reason: "missing_checkout_id" };
  }

  const checkout = await getYocoCheckout(checkoutId);

  if (checkoutIndicatesFailure(checkout)) {
    await abortPendingCheckout(organizationId);
    return { activated: false, reason: "payment_failed" };
  }

  if (!checkoutIndicatesPayment(checkout)) {
    return { activated: false, reason: "payment_pending" };
  }

  const metadataPlan =
    readYocoPaymentMetadata(checkout.metadata ?? undefined).plan ??
    subscription.pendingPlan;

  await activatePaidSubscription({
    organizationId,
    plan: metadataPlan,
    yocoCheckoutId: checkout.id,
    yocoPaymentId: checkout.paymentId,
  });

  return { activated: true };
}
