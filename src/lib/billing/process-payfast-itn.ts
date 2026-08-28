import "server-only";

import { billingPlanAmountCents } from "@/lib/billing/plans";
import { readPayfastPaymentMetadata } from "@/lib/billing/payfast-metadata";
import {
  abortPendingCheckout,
  activatePaidSubscription,
  getSubscriptionByOrganizationId,
} from "@/lib/billing/subscriptions";
import type { PayfastItnPayload } from "@/lib/payfast/verify-itn";

export { readPayfastPaymentMetadata };

function parseAmountCents(amountGross: string | undefined): number | null {
  if (!amountGross) return null;
  const parsed = Number.parseFloat(amountGross);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

export async function processPayfastPaymentComplete(
  data: PayfastItnPayload,
): Promise<{ activated: boolean; reason?: string }> {
  const { organizationId, plan } = readPayfastPaymentMetadata(data);
  if (!organizationId || !plan || plan === "core") {
    return { activated: false, reason: "missing_metadata" };
  }

  const pfPaymentId = data.pf_payment_id?.trim();
  const mPaymentId = data.m_payment_id?.trim() ?? null;

  const existing = await getSubscriptionByOrganizationId(organizationId);
  if (
    existing?.status === "active" &&
    existing.plan === plan &&
    pfPaymentId &&
    existing.payfastPaymentId === pfPaymentId
  ) {
    return { activated: false, reason: "already_activated" };
  }

  const expectedAmount = billingPlanAmountCents[plan];
  const paidCents = parseAmountCents(data.amount_gross);
  if (paidCents !== null && paidCents > 0 && paidCents !== expectedAmount) {
    return { activated: false, reason: "amount_mismatch" };
  }

  if (
    existing?.status === "pending" &&
    existing.payfastMPaymentId &&
    mPaymentId &&
    existing.payfastMPaymentId !== mPaymentId
  ) {
    return { activated: false, reason: "payment_id_mismatch" };
  }

  await activatePaidSubscription({
    organizationId,
    plan,
    payfastMPaymentId: mPaymentId,
    payfastPaymentId: pfPaymentId ?? null,
  });

  return { activated: true };
}

export async function processPayfastPaymentFailed(
  data: PayfastItnPayload,
): Promise<{ aborted: boolean; reason?: string }> {
  const { organizationId } = readPayfastPaymentMetadata(data);
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
