import { auth } from "@clerk/nextjs/server";

import { BillingScreen } from "@/components/dashboard/billing-screen";
import { normalizePlanIntent } from "@/lib/marketing/plan-intent";

type BillingPageProps = {
  searchParams: Promise<{ plan?: string; checkout?: string }>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  await auth.protect();

  const { plan, checkout } = await searchParams;
  const planIntent = normalizePlanIntent(plan);
  const autoCheckout =
    checkout === "1" &&
    planIntent !== null &&
    planIntent.clerkPlanSlug !== "free_org";

  return (
    <BillingScreen
      highlightedPlan={planIntent?.clerkPlanSlug}
      autoCheckoutPlanSlug={
        autoCheckout ? planIntent.clerkPlanSlug : undefined
      }
    />
  );
}
