import type { BillingPlanKey } from "@/lib/billing/features";

export type PaidBillingPlanKey = Exclude<BillingPlanKey, "core">;

/** Monthly prices in South African cents (ZAR). */
export const billingPlanAmountCents: Record<BillingPlanKey, number> = {
  core: 0,
  pro: 9_900,
};

export function isPaidPlan(plan: BillingPlanKey): plan is PaidBillingPlanKey {
  return plan !== "core";
}

export function normalizeBillingPlanKey(
  value?: string | null,
): BillingPlanKey | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  if (key === "core" || key === "pro") return key;
  // Legacy slugs
  if (key === "free_org" || key === "free") return "core";
  if (key === "engage" || key === "voice") return "pro";
  return null;
}
