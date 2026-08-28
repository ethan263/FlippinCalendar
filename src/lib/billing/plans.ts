import type { BillingPlanKey } from "@/lib/billing/features";

export type PaidBillingPlanKey = Exclude<BillingPlanKey, "core">;

/** Monthly prices in South African cents (ZAR). */
export const billingPlanAmountCents: Record<BillingPlanKey, number> = {
  core: 0,
  pro: 9_900,
};

export const billingPlanRank: Record<BillingPlanKey, number> = {
  core: 0,
  pro: 1,
};

export function isPaidPlan(plan: BillingPlanKey): plan is PaidBillingPlanKey {
  return plan !== "core";
}

export function isUpgradeTarget(
  current: BillingPlanKey,
  target: BillingPlanKey,
): boolean {
  return billingPlanRank[target] > billingPlanRank[current];
}

export function isCurrentOrHigherPlan(
  current: BillingPlanKey,
  target: BillingPlanKey,
): boolean {
  return billingPlanRank[current] >= billingPlanRank[target];
}

/** Normalize URL/DB plan slugs to core or pro. Legacy engage/voice tiers map to pro. */
export function normalizeBillingPlanKey(
  value?: string | null,
): BillingPlanKey | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  if (key === "core" || key === "pro") return key;
  // Legacy slugs — all paid tiers collapse to pro
  if (key === "engage" || key === "voice") return "pro";
  if (key === "free_org" || key === "free") return "core";
  return null;
}
