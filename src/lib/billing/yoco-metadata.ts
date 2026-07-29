import type { BillingPlanKey } from "@/lib/billing/features";
import { normalizeBillingPlanKey } from "@/lib/billing/plans";

const WINDOW_MS = 60 * 60 * 1000;

export function buildCheckoutIdempotencyKey(
  organizationId: string,
  plan: BillingPlanKey,
): string {
  const hourWindow = Math.floor(Date.now() / WINDOW_MS);
  return `fc:${organizationId}:${plan}:${hourWindow}`;
}

export function readYocoPaymentMetadata(
  metadata: Record<string, string> | undefined,
): { organizationId?: string; plan?: BillingPlanKey } {
  const organizationId = metadata?.organizationId?.trim();
  const plan = normalizeBillingPlanKey(metadata?.plan);
  return { organizationId, plan: plan ?? undefined };
}
