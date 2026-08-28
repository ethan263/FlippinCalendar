import type { BillingPlanKey } from "@/lib/billing/features";
import { normalizeBillingPlanKey } from "@/lib/billing/plans";

const WINDOW_MS = 60 * 60 * 1000;

export function buildCheckoutMPaymentId(
  organizationId: string,
  plan: BillingPlanKey,
): string {
  const hourWindow = Math.floor(Date.now() / WINDOW_MS);
  return `fc:${organizationId}:${plan}:${hourWindow}`;
}

export function readPayfastPaymentMetadata(data: PayfastItnLike): {
  organizationId?: string;
  plan?: BillingPlanKey;
} {
  const organizationId = data.custom_str1?.trim();
  const plan = normalizeBillingPlanKey(data.custom_str2);
  return { organizationId, plan: plan ?? undefined };
}

type PayfastItnLike = {
  custom_str1?: string;
  custom_str2?: string;
};
