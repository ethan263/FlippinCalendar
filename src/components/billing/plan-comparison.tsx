"use client";

import { useTransition } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { createYocoCheckoutAction } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { useEnsureActiveOrganization } from "@/lib/clerk/ensure-active-organization";
import { cn } from "@/lib/utils";
import { planDisplayName, type BillingPlanKey } from "@/lib/billing/features";
import {
  marketingPlans,
  pricingPeriodLabel,
  type MarketingPlanKey,
} from "@/lib/marketing/plans";

type PlanComparisonProps = {
  currentPlan: BillingPlanKey;
  highlightedPlan?: MarketingPlanKey;
  orgSlug: string;
};

export function PlanComparison({
  currentPlan,
  highlightedPlan,
  orgSlug,
}: PlanComparisonProps) {
  const [isPending, startTransition] = useTransition();
  const ensureActiveOrganization = useEnsureActiveOrganization();

  function startCheckout(planKey: MarketingPlanKey) {
    if (planKey === "core" || !orgSlug) return;
    startTransition(async () => {
      try {
        await ensureActiveOrganization();
        const { redirectUrl } = await createYocoCheckoutAction(planKey, orgSlug);
        window.location.href = redirectUrl;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not start checkout.",
        );
      }
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {marketingPlans.map((plan) => {
        const isCurrent = currentPlan === plan.key;
        const isHighlighted = highlightedPlan === plan.key || plan.featured;
        const isPaid = plan.key !== "core";

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
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {plan.description ?? plan.copy}
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
              disabled={isCurrent || !isPaid || isPending}
              onClick={() => startCheckout(plan.key)}
            >
              {isPending ? (
                <>
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                  Opening Yoco…
                </>
              ) : isCurrent ? (
                `Current · ${planDisplayName(currentPlan)}`
              ) : isPaid ? (
                `Pay with Yoco`
              ) : (
                "Included"
              )}
            </Button>
            {isPaid ? (
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                Secure hosted checkout · renews monthly
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
