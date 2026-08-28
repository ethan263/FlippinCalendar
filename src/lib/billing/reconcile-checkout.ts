import "server-only";

import {
  getSubscriptionByOrganizationId,
} from "@/lib/billing/subscriptions";

/** PayFast ITN is the source of truth — reconcile polls DB only. */
export async function reconcilePendingCheckout(
  organizationId: string,
): Promise<{ activated: boolean; reason?: string }> {
  const subscription = await getSubscriptionByOrganizationId(organizationId);
  if (!subscription) {
    return { activated: false, reason: "no_subscription" };
  }

  if (subscription.status !== "pending" || !subscription.pendingPlan) {
    if (
      subscription.status === "active" &&
      subscription.plan !== "core" &&
      !subscription.pendingPlan
    ) {
      return { activated: true };
    }
    return { activated: false, reason: "not_pending" };
  }

  return { activated: false, reason: "awaiting_itn" };
}
