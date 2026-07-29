"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CreditCard, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { fetchEntitlementsAction } from "@/app/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FeatureEntitlementCard } from "@/components/dashboard/feature-gates";
import { ScreenHeader } from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { BillingCheckoutLauncher } from "@/components/billing/billing-checkout-launcher";
import { PlanComparison } from "@/components/billing/plan-comparison";
import { planDisplayName, type BillingPlanKey } from "@/lib/billing/features";
import { isFreePlan, type MarketingPlanKey } from "@/lib/marketing/plans";

type BillingScreenProps = {
  orgSlug?: string;
  highlightedPlan?: MarketingPlanKey;
  autoCheckoutPlanKey?: MarketingPlanKey;
  checkoutStatus?: "success" | "cancelled" | "failed";
};

const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_ATTEMPTS = 15;

export function BillingScreen({
  orgSlug,
  highlightedPlan,
  autoCheckoutPlanKey,
  checkoutStatus,
}: BillingScreenProps) {
  const { organization } = useWorkspace();
  const resolvedSlug = orgSlug || organization?.slug || "";
  const [currentPlan, setCurrentPlan] = useState<BillingPlanKey>("core");
  const [pendingPlan, setPendingPlan] = useState<BillingPlanKey | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
      toast.message("Checkout cancelled", {
        description: "No charge was made. Choose a plan when you are ready.",
      });
      return;
    }

    if (checkoutStatus === "failed") {
      toast.error("Payment failed", {
        description: "Your card was declined or the payment could not complete.",
      });
      void refreshEntitlements();
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const pollForActivation = async () => {
      while (!cancelled && attempts < POLL_MAX_ATTEMPTS) {
        attempts += 1;
        try {
          const entitlements = await refreshEntitlements();
          if (
            entitlements.pendingPlan === null &&
            !isFreePlan(entitlements.plan)
          ) {
            toast.success("Plan activated", {
              description: `${planDisplayName(entitlements.plan)} is now active for your business.`,
            });
            return;
          }
        } catch {
          // keep polling
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      if (!cancelled) {
        toast.message("Payment received", {
          description:
            "Your plan is still syncing. Refresh this page in a moment if features are not unlocked yet.",
        });
      }
    };

    void pollForActivation();
    return () => {
      cancelled = true;
    };
  }, [checkoutStatus, refreshEntitlements]);

  const statusLabel = pendingPlan
    ? `Upgrading to ${planDisplayName(pendingPlan)}`
    : "Active";

  return (
    <>
      {autoCheckoutPlanKey && !isFreePlan(autoCheckoutPlanKey) ? (
        <BillingCheckoutLauncher planKey={autoCheckoutPlanKey} />
      ) : null}
      <ScreenHeader
        eyebrow="Business subscription"
        title="Billing"
        description={`Plans and payments belong to ${organization?.name ?? "this business"}—not individual members. Upgrades apply across the whole business.`}
      />

      <section className="grid gap-4 md:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
        <Card className="bg-[#20201e] text-white ring-black/15">
          <CardContent className="flex h-full flex-col justify-between pt-0">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-white/10">
                  <CreditCard className="size-4 text-primary" />
                </span>
                <Badge variant="outline" className="border-white/15 bg-white/5 text-white">
                  {statusLabel}
                </Badge>
              </div>
              <p className="mt-8 text-[10px] font-semibold tracking-[0.16em] text-white/45 uppercase">
                Current plan
              </p>
              <p className="mt-1 font-heading text-4xl font-semibold tracking-[-0.045em]">
                {isLoaded ? planDisplayName(currentPlan) : "—"}
              </p>
              <p className="mt-3 text-xs leading-5 text-white/50">
                Clerk handles sign-in. Yoco hosts checkout. Plan access is stored
                on your business record in Supabase.
              </p>
            </div>
            <div className="mt-8 space-y-2 border-t border-white/10 pt-4 text-[11px] text-white/60">
              <p className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-emerald-400" /> Business-scoped billing
              </p>
              <p className="flex items-center gap-2">
                <UsersRound className="size-3.5 text-sky-400" /> Clerk auth only
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureEntitlementCard feature="web_agent" />
          <FeatureEntitlementCard feature="browser_voice" />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
              Compare plans
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold tracking-[-0.025em]">
              Choose the channels you need.
            </h2>
          </div>
          <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:inline-flex">
            <Check className="size-3.5" /> Yoco secure checkout
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white p-3 sm:p-5">
          <PlanComparison
            currentPlan={currentPlan}
            highlightedPlan={highlightedPlan}
            orgSlug={resolvedSlug}
          />
        </div>
      </section>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-black/10 bg-white p-3 text-[11px] leading-5 text-muted-foreground">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        Monthly renewals use a new Yoco checkout link before your period ends.
        Test mode: use card 4111 1111 1111 1111 with any future expiry and CVC.
      </div>
    </>
  );
}
