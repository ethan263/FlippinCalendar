import { redirect } from "next/navigation";

import { reconcilePendingCheckoutAction } from "@/app/actions/billing";
import { BillingScreen } from "@/components/dashboard/billing-screen";
import {
  canAccessBillingAndSettings,
  requireCurrentOrganizationForRouteSlug,
} from "@/lib/data/auth";
import { normalizePlanIntent } from "@/lib/marketing/plan-intent";
import { isFreePlan } from "@/lib/marketing/plans";
import { getPayfastMode } from "@/lib/payfast/config";

type BillingPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ plan?: string; checkout?: string; upgrade?: string }>;
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
  const { orgSlug } = await params;
  const current = await requireCurrentOrganizationForRouteSlug(orgSlug);
  if (!canAccessBillingAndSettings(current.auth)) {
    redirect(`/app/${orgSlug}`);
  }

  const { plan, checkout, upgrade } = await searchParams;
  const planIntent = normalizePlanIntent(plan);

  if (checkout === "1" && planIntent && !isFreePlan(planIntent.key)) {
    redirect(
      `/app/${orgSlug}/billing?plan=${encodeURIComponent(planIntent.key)}&upgrade=1`,
    );
  }

  const checkoutStatus = normalizeCheckoutStatus(checkout);
  const openCheckoutPanel =
    upgrade === "1" &&
    planIntent !== null &&
    !isFreePlan(planIntent.key);

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
      payfastMode={getPayfastMode()}
      openCheckoutPanel={openCheckoutPanel}
      checkoutStatus={checkoutStatus}
    />
  );
}
