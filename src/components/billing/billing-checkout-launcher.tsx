"use client";

import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";

import { createYocoCheckoutAction } from "@/app/actions/billing";
import { useEnsureActiveOrganization } from "@/lib/clerk/ensure-active-organization";
import type { MarketingPlanKey } from "@/lib/marketing/plans";
import { isFreePlan } from "@/lib/marketing/plans";

type BillingCheckoutLauncherProps = {
  planKey: MarketingPlanKey;
  orgSlug: string;
};

export function BillingCheckoutLauncher({
  planKey,
  orgSlug,
}: BillingCheckoutLauncherProps) {
  const launchedRef = useRef(false);
  const [, startTransition] = useTransition();
  const ensureActiveOrganization = useEnsureActiveOrganization();

  useEffect(() => {
    if (launchedRef.current || isFreePlan(planKey) || !orgSlug) {
      return;
    }

    launchedRef.current = true;
    startTransition(async () => {
      try {
        await ensureActiveOrganization();
        const { redirectUrl } = await createYocoCheckoutAction(planKey, orgSlug);
        window.location.href = redirectUrl;
      } catch (error) {
        launchedRef.current = false;
        toast.error(
          error instanceof Error ? error.message : "Could not start checkout.",
        );
      }
    });
  }, [orgSlug, planKey]);

  return null;
}
