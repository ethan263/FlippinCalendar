"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchEntitlementsAction, reconcilePendingCheckoutAction } from "@/app/actions/billing";
import { BillingCheckoutPanel } from "@/components/billing/billing-checkout-panel";
import { PlanComparison } from "@/components/billing/plan-comparison";
import { Badge } from "@/components/ui/badge";
import { ScreenHeader, LoadingPanel } from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { planDisplayName, type BillingPlanKey } from "@/lib/billing/features";
import { isFreePlan, type MarketingPlanKey } from "@/lib/marketing/plans";

type BillingScreenProps = {
  orgSlug?: string;
  highlightedPlan?: MarketingPlanKey;
  payfastMode: "sandbox" | "live";
  openCheckoutPanel?: boolean;
  checkoutStatus?: "success" | "cancelled" | "failed";
};

const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_ATTEMPTS = 15;

export function BillingScreen({
  orgSlug,
  highlightedPlan,
  payfastMode,
  openCheckoutPanel = false,
  checkoutStatus,
}: BillingScreenProps) {
  const { organization } = useWorkspace();
  const resolvedSlug = orgSlug || organization?.slug || "";
  const [currentPlan, setCurrentPlan] = useState<BillingPlanKey>("core");
  const [pendingPlan, setPendingPlan] = useState<BillingPlanKey | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showCheckout, setShowCheckout] = useState(openCheckoutPanel);

  const refreshEntitlements = useCallback(async () => {
    const entitlements = await fetchEntitlementsAction();
    setCurrentPlan(entitlements.plan);
    setPendingPlan(entitlements.pendingPlan);
    setIsLoaded(true);
    return entitlements;
  }, []);

  useEffect(() => {
    void refreshEntitlements().catch(() => setIsLoaded(true));
  }, [organization?._id, refreshEntitlements]);

  useEffect(() => {
    if (!checkoutStatus) return;

    if (checkoutStatus === "cancelled") {
      toast.message("Checkout cancelled");
      return;
    }

    if (checkoutStatus === "failed") {
      toast.error("Payment failed");
      void refreshEntitlements();
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const pollForActivation = async () => {
      while (!cancelled && attempts < POLL_MAX_ATTEMPTS) {
        attempts += 1;
        try {
          if (attempts === 1 || attempts % 3 === 0) {
            await reconcilePendingCheckoutAction(resolvedSlug);
          }
          const entitlements = await refreshEntitlements();
          if (
            entitlements.pendingPlan === null &&
            !isFreePlan(entitlements.plan)
          ) {
            toast.success(`${planDisplayName(entitlements.plan)} activated`);
            return;
          }
        } catch {
          // keep polling
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      if (!cancelled) {
        toast.message("Payment received — refresh if your plan is still syncing");
      }
    };

    void pollForActivation();
    return () => {
      cancelled = true;
    };
  }, [checkoutStatus, refreshEntitlements, resolvedSlug]);

  const statusLabel = pendingPlan
    ? `Upgrading to ${planDisplayName(pendingPlan)}`
    : null;

  const canCheckout =
    highlightedPlan &&
    !isFreePlan(highlightedPlan) &&
    currentPlan !== highlightedPlan;

  return (
    <>
      <ScreenHeader title="Billing" />

      {!isLoaded ? (
        <LoadingPanel rows={4} label="Loading your plan…" />
      ) : (
        <>
          <div className="mb-8 flex items-center gap-3 rounded-lg border border-black/10 bg-white px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Current plan</p>
              <p className="font-heading text-2xl font-semibold tracking-tight">
                {planDisplayName(currentPlan)}
              </p>
            </div>
            {statusLabel ? (
              <Badge variant="outline">{statusLabel}</Badge>
            ) : null}
          </div>

          {showCheckout && canCheckout ? (
            <div className="mb-6">
              <BillingCheckoutPanel
                planKey={highlightedPlan}
                orgSlug={resolvedSlug}
                payfastMode={payfastMode}
                onClose={() => setShowCheckout(false)}
              />
            </div>
          ) : null}

          <PlanComparison
            currentPlan={currentPlan}
            highlightedPlan={highlightedPlan}
            orgSlug={resolvedSlug}
            payfastMode={payfastMode}
          />
        </>
      )}
    </>
  );
}
