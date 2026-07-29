"use client";

import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";

import { createYocoCheckoutAction } from "@/app/actions/billing";
import type { MarketingPlanKey } from "@/lib/marketing/plans";
import { isFreePlan } from "@/lib/marketing/plans";

type BillingCheckoutLauncherProps = {
  planKey: MarketingPlanKey;
};

export function BillingCheckoutLauncher({ planKey }: BillingCheckoutLauncherProps) {
  const launchedRef = useRef(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (launchedRef.current || isFreePlan(planKey)) {
      return;
    }

    launchedRef.current = true;
    startTransition(async () => {
      try {
        const { redirectUrl } = await createYocoCheckoutAction(planKey);
        window.location.href = redirectUrl;
      } catch (error) {
        launchedRef.current = false;
        toast.error(
          error instanceof Error ? error.message : "Could not start checkout.",
        );
      }
    });
  }, [planKey]);

  return null;
}
