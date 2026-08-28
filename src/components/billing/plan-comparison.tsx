"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { BillingCheckoutPanel } from "@/components/billing/billing-checkout-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { planDisplayName, type BillingPlanKey } from "@/lib/billing/features";
import {
  isCurrentOrHigherPlan,
  isPaidPlan,
} from "@/lib/billing/plans";
import {
  marketingPlans,
  pricingPeriodLabel,
  type MarketingPlanKey,
} from "@/lib/marketing/plans";

type PlanComparisonProps = {
  currentPlan: BillingPlanKey;
  highlightedPlan?: MarketingPlanKey;
  orgSlug: string;
  payfastMode: "sandbox" | "live";
};

export function PlanComparison({
  currentPlan,
  highlightedPlan,
  orgSlug,
  payfastMode,
}: PlanComparisonProps) {
  const [checkoutPlan, setCheckoutPlan] = useState<MarketingPlanKey | null>(
    null,
  );

  return (
    <>
      {checkoutPlan ? (
        <div className="mb-6">
          <BillingCheckoutPanel
            planKey={checkoutPlan}
            orgSlug={orgSlug}
            payfastMode={payfastMode}
            onClose={() => setCheckoutPlan(null)}
          />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {marketingPlans.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          const isHighlighted = highlightedPlan === plan.key || plan.featured;
          const isPaid = isPaidPlan(plan.key);
          const alreadyIncluded =
            isPaid && isCurrentOrHigherPlan(currentPlan, plan.key) && !isCurrent;
          const canUpgrade = isPaid && !isCurrent && !alreadyIncluded;

          return (
            <article
              key={plan.key}
              className={cn(
                "flex flex-col rounded-xl border p-5",
                isHighlighted
                  ? "border-primary bg-primary/5"
                  : "border-black/10 bg-white",
              )}
            >
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {plan.name}
              </p>
              <p className="mt-3 font-heading text-4xl font-semibold tracking-tight">
                {plan.price}
                <span className="ml-1 font-sans text-xs text-muted-foreground">
                  {pricingPeriodLabel}
                </span>
              </p>
              <ul className="mt-4 space-y-2 border-t border-black/8 pt-4 text-xs">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-5 w-full"
                variant={isHighlighted ? "default" : "outline"}
                disabled={isCurrent || !canUpgrade}
                onClick={() => setCheckoutPlan(plan.key)}
              >
                {isCurrent
                  ? `Current · ${planDisplayName(currentPlan)}`
                  : alreadyIncluded
                    ? "Included"
                    : isPaid
                      ? `Upgrade to ${plan.name}`
                      : "Included"}
              </Button>
            </article>
          );
        })}
      </div>
    </>
  );
}
