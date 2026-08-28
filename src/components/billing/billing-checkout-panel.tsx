"use client";

import { useState, useTransition } from "react";
import { Check, CreditCard, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import { createPayfastCheckoutAction } from "@/app/actions/billing";
import { PayfastCheckoutForm } from "@/components/billing/payfast-checkout-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEnsureActiveOrganization } from "@/lib/clerk/ensure-active-organization";
import { planDisplayName } from "@/lib/billing/features";
import { billingPlanAmountCents } from "@/lib/billing/plans";
import {
  marketingPlans,
  pricingPeriodLabel,
  type MarketingPlanKey,
} from "@/lib/marketing/plans";

type BillingCheckoutPanelProps = {
  planKey: MarketingPlanKey;
  orgSlug: string;
  payfastMode: "sandbox" | "live";
  onClose?: () => void;
};

function formatZar(cents: number): string {
  return `R${(cents / 100).toFixed(0)}`;
}

export function BillingCheckoutPanel({
  planKey,
  orgSlug,
  payfastMode,
  onClose,
}: BillingCheckoutPanelProps) {
  const plan = marketingPlans.find((entry) => entry.key === planKey);
  const [checkoutForm, setCheckoutForm] = useState<{
    actionUrl: string;
    fields: Record<string, string>;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const ensureActiveOrganization = useEnsureActiveOrganization();

  if (!plan || planKey === "core") {
    return null;
  }

  const amountCents = billingPlanAmountCents[planKey];

  function continueToPayfast() {
    startTransition(async () => {
      try {
        await ensureActiveOrganization();
        const form = await createPayfastCheckoutAction(planKey, orgSlug);
        setCheckoutForm(form);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not start checkout.",
        );
      }
    });
  }

  return (
    <>
      {checkoutForm ? (
        <PayfastCheckoutForm
          actionUrl={checkoutForm.actionUrl}
          fields={checkoutForm.fields}
          submitOnMount
        />
      ) : null}

      <Card className="border-primary/25 bg-white shadow-sm">
        <CardHeader className="gap-3 border-b border-black/8 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Checkout
              </p>
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                Upgrade to {planDisplayName(planKey)}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {payfastMode === "sandbox" ? (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                  Sandbox
                </Badge>
              ) : null}
              {onClose ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  aria-label="Close checkout"
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          <div className="flex items-baseline justify-between gap-4 rounded-lg border border-black/10 bg-[#faf9f5] px-4 py-3">
            <div>
              <p className="text-sm font-medium">{plan.name}</p>
              <p className="text-xs text-muted-foreground">
                Billed monthly · cancel anytime
              </p>
            </div>
            <p className="font-heading text-3xl font-semibold tracking-tight">
              {formatZar(amountCents)}
              <span className="ml-1 font-sans text-xs text-muted-foreground">
                {pricingPeriodLabel}
              </span>
            </p>
          </div>

          <ul className="space-y-2 text-sm">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-start gap-2 rounded-lg border border-black/8 bg-white px-3 py-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              You&apos;ll complete payment securely on PayFast. Your plan
              activates after PayFast confirms payment — usually within a few
              seconds.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {onClose ? (
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Not now
              </Button>
            ) : null}
            <Button
              type="button"
              className="sm:min-w-44"
              disabled={isPending || Boolean(checkoutForm)}
              onClick={continueToPayfast}
            >
              {isPending || checkoutForm ? (
                <>
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                  Opening PayFast…
                </>
              ) : (
                <>
                  <CreditCard data-icon="inline-start" />
                  Pay with PayFast
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
