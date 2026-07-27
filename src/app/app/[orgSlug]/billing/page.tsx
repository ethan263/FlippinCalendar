import { auth } from "@clerk/nextjs/server";

import { BillingScreen } from "@/components/dashboard/billing-screen";
import { normalizePlanIntent } from "@/lib/marketing/plan-intent";
import { clearPlanIntentCookie } from "@/lib/marketing/plan-intent-cookie";

type BillingPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ plan?: string; checkout?: string }>;
};

export default async function BillingPage({
  params,
  searchParams,
}: BillingPageProps) {
  await auth.protect();

  const { orgSlug } = await params;
  const { plan, checkout } = await searchParams;
  const planIntent = normalizePlanIntent(plan);
  const autoCheckout =
    checkout === "1" &&
    planIntent !== null &&
    planIntent.clerkPlanSlug !== "free_org";

  if (autoCheckout) {
    await clearPlanIntentCookie();
  }

  return (
    <BillingScreen
      orgSlug={orgSlug}
      highlightedPlan={planIntent?.clerkPlanSlug}
      autoCheckoutPlanSlug={
        autoCheckout ? planIntent.clerkPlanSlug : undefined
      }
    />
  );
}
