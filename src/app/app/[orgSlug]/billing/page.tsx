import { auth } from "@clerk/nextjs/server";

import { reconcilePendingCheckoutAction } from "@/app/actions/billing";
import { BillingScreen } from "@/components/dashboard/billing-screen";
import { normalizePlanIntent } from "@/lib/marketing/plan-intent";
import { isFreePlan } from "@/lib/marketing/plans";
import { clearPlanIntentCookie } from "@/lib/marketing/plan-intent-cookie";

type BillingPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ plan?: string; checkout?: string }>;
};

function normalizeCheckoutStatus(
  value?: string,
): "success" | "cancelled" | "failed" | undefined {
  if (value === "success" || value === "cancelled" || value === "failed") {
    return value;
  }
  return undefined;
}

export default async function BillingPage({
  params,
  searchParams,
}: BillingPageProps) {
  await auth.protect();

  const { orgSlug } = await params;
  const { plan, checkout } = await searchParams;
  const planIntent = normalizePlanIntent(plan);
  const checkoutStatus = normalizeCheckoutStatus(checkout);
  const autoCheckout =
    checkout === "1" && planIntent !== null && !isFreePlan(planIntent.key);

  if (autoCheckout) {
    await clearPlanIntentCookie();
  }

  if (checkoutStatus === "success") {
    try {
      await reconcilePendingCheckoutAction(orgSlug);
    } catch {
      // Client polling will retry reconciliation if the webhook is delayed.
    }
  }

  return (
    <BillingScreen
      orgSlug={orgSlug}
      highlightedPlan={planIntent?.key}
      autoCheckoutPlanKey={autoCheckout ? planIntent.key : undefined}
      checkoutStatus={checkoutStatus}
    />
  );
}
