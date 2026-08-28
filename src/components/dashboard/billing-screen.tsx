"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { reconcilePendingCheckoutAction } from "@/app/actions/billing";
import { BillingCheckoutPanel } from "@/components/billing/billing-checkout-panel";
import { PlanComparison } from "@/components/billing/plan-comparison";
import { Badge } from "@/components/ui/badge";
import { ScreenHeader, LoadingPanel } from "@/components/dashboard/screen-kit";
import {
  useFeatureEntitlements,
  useRefreshEntitlements,
} from "@/components/dashboard/feature-gates";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { planDisplayName } from "@/lib/billing/features";
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
  const router = useRouter();
  const { organization } = useWorkspace();
  const entitlements = useFeatureEntitlements();
  const refreshEntitlements = useRefreshEntitlements();
  const resolvedSlug = orgSlug || organization?.slug || "";
  const [showCheckout, setShowCheckout] = useState(openCheckoutPanel);

  useEffect(() => {
    void refreshEntitlements();
  }, [refreshEntitlements]);

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
          const next = await refreshEntitlements();
          if (next.pendingPlan === null && !isFreePlan(next.plan)) {
            toast.success(`${planDisplayName(next.plan)} activated`);
            router.replace(`/app/${resolvedSlug}/billing`);
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
  }, [checkoutStatus, refreshEntitlements, resolvedSlug, router]);

  const statusLabel = entitlements.pendingPlan
    ? `Upgrading to ${planDisplayName(entitlements.pendingPlan)}`
    : null;

  const canCheckout =
    highlightedPlan &&
    !isFreePlan(highlightedPlan) &&
    entitlements.plan !== highlightedPlan;

  return (
    <>
      <ScreenHeader title="Billing" />

      {!entitlements.isLoaded ? (
        <LoadingPanel rows={4} label="Loading your plan…" />
      ) : (
        <>
          <div className="mb-8 flex items-center gap-3 rounded-lg border border-black/10 bg-white px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Current plan</p>
              <p className="font-heading text-2xl font-semibold tracking-tight">
                {planDisplayName(entitlements.plan)}
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
            currentPlan={entitlements.plan}
            highlightedPlan={highlightedPlan}
            orgSlug={resolvedSlug}
            payfastMode={payfastMode}
          />
        </>
      )}
    </>
  );
}
