import type { BillingPlanKey } from "@/lib/billing/features";

export type PaidBillingPlanKey = Exclude<BillingPlanKey, "core">;

/** Monthly prices in South African cents (ZAR). */
export const billingPlanAmountCents: Record<BillingPlanKey, number> = {
  core: 0,
  pro: 24_900,
  voice: 69_900,
};

export function isPaidPlan(plan: BillingPlanKey): plan is PaidBillingPlanKey {
  return plan !== "core";
}

export function normalizeBillingPlanKey(
  value?: string | null,
): BillingPlanKey | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  if (key === "core" || key === "pro" || key === "voice") return key;
  // Legacy Clerk slugs
  if (key === "free_org") return "core";
  if (key === "engage") return "pro";
  return null;
}
